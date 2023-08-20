import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  OK,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
} from "http-status";
import axios from "axios";
import {
  Role,
  User,
  Group,
  UserTg,
  ChatTg,
  UpdateTg,
  ChatTypeTg,
} from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import groupsDynamoServices from "../../services/dynamoGroupsServices";
import commandsDynamoServices from "../../services/dynamoCommandsService";
import { getCommandKey, hasCommand } from "../../utils/telegram";

const putUser = async (from: UserTg) => {
  try {
    const currentUser = await usersDynamoService.getById(from?.id);
    if (!currentUser) {
      return usersDynamoService.create(from);
    }

    const user: User = { ...currentUser, username: from?.username };
    return usersDynamoService.update(user);
  } catch (error) {
    console.error(`telegram_webhook.putUser: ${error?.message}`, error);
  }
};

const putGroup = async (chat: ChatTg) => {
  if (chat?.type === ChatTypeTg.PRIVATE) {
    return;
  }

  try {
    const foundGroup = await groupsDynamoServices.getById(chat?.id);
    if (!foundGroup) {
      return groupsDynamoServices.create(chat);
    }

    const group: Group = { ...foundGroup, title: chat?.title };
    return groupsDynamoServices.update(group);
  } catch (error) {
    console.error(`telegram_webhook.putGroup: ${error?.message}`, error);
  }
};

const sendToEndpointCommand = async (body: UpdateTg) => {
  const { offset, length } = getCommandKey(body);
  const commandInMessage = body?.message?.text?.substring(offset, length);
  const command = await commandsDynamoServices.get(commandInMessage);
  if (!command?.endpoint) {
    return;
  }

  try {
    await axios.post(command?.endpoint, body);
  } catch (error) {
    console.error(
      `telegram_webhook: POST ${command?.endpoint} - ${error?.message}`
    );
  }
};

export const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  await Promise.all([
    putUser(body?.message?.from),
    putGroup(body?.message?.chat),
  ]);

  if (body?.message?.from?.is_bot) {
    return { statusCode: OK };
  }

  if (hasCommand(body)) {
    await sendToEndpointCommand(body);
  }

  return { statusCode: OK };
};

export const telegramWebhook = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  try {
    const { id, apiKey } = event?.queryStringParameters ?? {};

    const user = await usersDynamoService.get(`${id}`);
    if (
      !user?.role ||
      user?.apiKey !== apiKey ||
      ![Role.ROOT, Role.ADMIN, Role.SERVICE].includes(user?.role)
    ) {
      throw new Error("Unauthorized");
    }
  } catch (error) {
    return callback(null, { statusCode: UNAUTHORIZED });
  }

  if (!event?.body) {
    return callback(null, { statusCode: BAD_REQUEST });
  }

  try {
    const body = JSON.parse(event?.body);
    console.log("telegram_webhook body:\n", JSON.stringify(body, null, 2));
    const response = await execute(body);
    return callback(null, response);
  } catch (error) {
    console.error(`telegram_webhook.telegramWebhook: ${error?.message}`, error);
    return callback(error, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

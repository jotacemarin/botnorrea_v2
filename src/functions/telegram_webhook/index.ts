import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  OK,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
} from "http-status";
import axios from "axios";
import { Role, User, Group, UserTg, ChatTg, UpdateTg } from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import groupsDynamoServices from "../../services/dynamoGroupsServices";
import dynamoDynamoServices from "../../services/dynamoCommandsService";
import { getCommandKey, hasCommand } from "../../utils/telegram";

const putUser = async (from: UserTg) => {
  try {
    const { Items } = await usersDynamoService.getById(from?.id);
    if (!Items?.length) {
      return await usersDynamoService.create(from);
    }
    const [Item] = Items;
    const user: User = { ...Item, username: from?.username };
    return await usersDynamoService.update(user);
  } catch (error) {
    console.error(`telegram_webhook.putUser: ${error?.message}`, error);
  }
};

const putGroup = async (chat: ChatTg) => {
  try {
    const { Items } = await groupsDynamoServices.getById(chat?.id);
    if (!Items?.length) {
      return await groupsDynamoServices.create(chat);
    }
    const [Item] = Items;
    const group: Group = { ...Item, title: chat?.title };
    return await groupsDynamoServices.update(group);
  } catch (error) {
    console.error(`telegram_webhook.putGroup: ${error?.message}`, error);
  }
};

const sendToEndpointCommand = async (body: UpdateTg) => {
  try {
    const { offset, length } = getCommandKey(body);
    const command = body?.message?.text?.substring(offset, length);
    const { endpoint } = await dynamoDynamoServices.get(command);
    if (!endpoint) {
      return;
    }

    await axios.post(endpoint, body);
  } catch (error) {
    console.error(
      `telegram_webhook.sendToEndpointCommand: ${error?.message}`,
      error
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

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
  TelegramUpdate,
  TelegramUser,
  TelegramChat,
  Group,
} from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import groupsDynamoServices from "../../services/dynamoGroupsServices";

const { PIPEDREAM_TEST } = process.env;

const putUser = async (from: TelegramUser) => {
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

const putGroup = async (chat: TelegramChat) => {
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

export const execute = async (
  body: TelegramUpdate
): Promise<{ statusCode: number; body?: string }> => {
  await Promise.all([
    putUser(body?.message?.from),
    putGroup(body?.message?.chat),
  ]);
  await axios.post(`${PIPEDREAM_TEST}`, body);
  return { statusCode: OK, body: JSON.stringify(body) };
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

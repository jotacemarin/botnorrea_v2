import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  OK,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
} from "http-status";
import axios from "axios";
import {
  getCommand,
  putCommand,
  scanCommand,
  updateCommand,
} from "../../services/dynamodb";
import {
  Role,
  User,
  TelegramUpdate,
  TelegramUser,
  TelegramChat,
  Group,
} from "../../models";
import { buildExpressions } from "../../utils/dynamoDbHelper";
import { randomUUID } from "crypto";

const { DYNAMODB_TABLE_USERS, DYNAMODB_TABLE_GROUPS, PIPEDREAM_TEST } =
  process.env;
const tableUsers = `${DYNAMODB_TABLE_USERS}`;
const tableGroups = `${DYNAMODB_TABLE_GROUPS}`;

const putUser = async (from: TelegramUser) => {
  try {
    const timestamp = new Date().getTime();

    const { Items } = await scanCommand({
      TableName: tableUsers,
      ProjectionExpression: "#uuid, #id",
      ExpressionAttributeNames: {
        "#uuid": "uuid",
        "#id": "id",
      },
      ExpressionAttributeValues: {
        ":id": from?.id,
      },
      FilterExpression: "id = :id",
    });

    if (!Items?.length) {
      const user: User = {
        uuid: randomUUID(),
        id: from?.id,
        role: Role.USER,
        username: from?.username ?? "",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return await putCommand({ TableName: tableUsers, Item: user });
    }

    const [Item] = Items;
    const user: User = {
      username: from?.username,
      updatedAt: timestamp,
    };
    const {
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      UpdateExpression,
    } = buildExpressions(user);

    return await updateCommand({
      TableName: tableUsers,
      Key: { uuid: Item?.uuid },
      ExpressionAttributeValues,
      UpdateExpression,
      ExpressionAttributeNames,
    });
  } catch (error) {
    console.error(`telegram_webhook.putUser: ${error?.message}`, error);
  }
};

const putGroup = async (chat: TelegramChat) => {
  try {
    const timestamp = new Date().getTime();

    const { Items } = await scanCommand({
      TableName: tableGroups,
      ProjectionExpression: "#uuid, #id",
      ExpressionAttributeNames: {
        "#uuid": "uuid",
        "#id": "id",
      },
      ExpressionAttributeValues: {
        ":id": chat?.id,
      },
      FilterExpression: "id = :id",
    });

    if (!Items?.length) {
      const group: Group = {
        uuid: randomUUID(),
        id: chat?.id,
        title: chat?.title,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return await putCommand({ TableName: tableGroups, Item: group });
    }

    const [Item] = Items;
    const group: Group = {
      title: chat?.title,
      updatedAt: timestamp,
    };

    const {
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      UpdateExpression,
    } = buildExpressions(group);

    return await updateCommand({
      TableName: tableGroups,
      Key: { uuid: Item?.uuid },
      ExpressionAttributeValues,
      UpdateExpression,
      ExpressionAttributeNames,
    });
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

    const data = await getCommand({
      TableName: tableUsers,
      Key: { uuid: `${id}` },
    });
    const user = data?.Item as User;

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
      statusCode: error?.statusCode ?? INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

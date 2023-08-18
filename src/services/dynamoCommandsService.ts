import { randomUUID } from "crypto";
import {
  BAD_GATEWAY,
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
} from "http-status";
import {
  deleteCommand,
  getCommand,
  putCommand,
  scanCommand,
  updateCommand,
} from "./dynamodb";
import { buildExpressions } from "../utils/dynamoDbHelper";
import { Command, Role, User } from "../models";

const { DYNAMODB_TABLE_COMMANDS } = process.env;
const tableCommands = `${DYNAMODB_TABLE_COMMANDS}`;

export class CommandsError extends Error {
  statusCode: number = INTERNAL_SERVER_ERROR;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "CommandsError";
  }
}

const hasAuthorization = (apiKey: string, user: User) => {
  if (!user?.apiKey) {
    return false;
  }

  if (![Role.ROOT, Role.ADMIN]) {
    return true;
  }

  return apiKey === user?.apiKey;
};

const get = async (command: string): Promise<Command> => {
  const { Item } = await getCommand({
    TableName: tableCommands,
    Key: { command },
  });
  return Item as Command;
};

const getByUuid = async (uuid: string) => {
  return await scanCommand({
    TableName: tableCommands,
    ProjectionExpression: "#command, #endpoint, #uuid",
    ExpressionAttributeNames: {
      "#uuid": "uuid",
      "#command": "command",
      "#endpoint": "endpoint",
    },
    ExpressionAttributeValues: {
      ":uuid": uuid,
    },
    FilterExpression: "uuid = :uuid",
  });
};

const getByApiKey = async (apiKey: string) => {
  return await scanCommand({
    TableName: tableCommands,
    ProjectionExpression: "#command, #apiKey, #endpoint",
    ExpressionAttributeNames: {
      "#command": "command",
      "#apiKey": "apiKey",
      "#endpoint": "endpoint",
    },
    ExpressionAttributeValues: {
      ":apiKey": apiKey,
    },
    FilterExpression: "apiKey = :apiKey",
  });
};

const create = async (params: Command): Promise<Command> => {
  const Item = await get(`${params?.command}`);
  if (Item) {
    throw new CommandsError("Forbidden", FORBIDDEN);
  }

  const timestamp = new Date().getTime();
  const uuid = randomUUID();
  const command: Command = {
    ...params,
    uuid,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await putCommand({ TableName: tableCommands, Item: command });
  return await get(uuid);
};

const update = async (params: Command, user: User): Promise<Command> => {
  if (!params?.uuid) {
    throw new CommandsError("Bad request", BAD_REQUEST);
  }

  const Item = await get(params?.uuid);
  if (!Item) {
    throw new CommandsError("Not found", NOT_FOUND);
  }

  if (!Item?.command) {
    throw new CommandsError("Bad gateway", BAD_GATEWAY);
  }

  if (!hasAuthorization(`${Item?.apiKey}`, user)) {
    throw new CommandsError("Unauthorized", UNAUTHORIZED);
  }

  const timestamp = new Date().getTime();
  const command: Command = {
    ...Item,
    ...params,
    updatedAt: timestamp,
  };
  delete command?.apiKey;

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = buildExpressions(command);

  await updateCommand({
    TableName: tableCommands,
    Key: { command: Item?.command },
    ExpressionAttributeValues,
    UpdateExpression,
    ExpressionAttributeNames,
  });

  return await get(Item?.command);
};

const remove = async (uuid: string) => {
  await deleteCommand({ TableName: tableCommands, Key: { uuid } });
};

export default { get, getByUuid, getByApiKey, create, update, remove };

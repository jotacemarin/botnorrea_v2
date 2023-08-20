import { randomUUID } from "crypto";
import {
  BAD_GATEWAY,
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY,
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

class CommandsError extends Error {
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

const get = async (commandKey: string): Promise<Command> => {
  const { Item: command } = await getCommand({
    TableName: tableCommands,
    Key: { command: commandKey },
  });
  return command as Command;
};

const getByUuid = async (uuid: string): Promise<Command | undefined> => {
  const { Items } = await scanCommand({
    TableName: tableCommands,
    ProjectionExpression: "#command, #uuid",
    ExpressionAttributeNames: {
      "#uuid": "uuid",
      "#command": "command",
    },
    ExpressionAttributeValues: {
      ":uuid": uuid,
    },
    FilterExpression: "uuid = :uuid",
  });

  if (!Items?.length) {
    return;
  }

  if (Items?.length > 1) {
    throw new CommandsError("Unprocessable entity", UNPROCESSABLE_ENTITY);
  }

  const [Item] = Items;
  return get(Item?.command);
};

const getByApiKey = async (apiKey: string): Promise<Array<Command>> => {
  const { Items: commands } = await scanCommand({
    TableName: tableCommands,
    ProjectionExpression: "#command, #apiKey, #endpoint, #description",
    ExpressionAttributeNames: {
      "#command": "command",
      "#apiKey": "apiKey",
      "#endpoint": "endpoint",
      "#description": "description",
    },
    ExpressionAttributeValues: {
      ":apiKey": apiKey,
    },
    FilterExpression: "apiKey = :apiKey",
  });

  return commands as Array<Command>;
};

const create = async (params: Command): Promise<Command> => {
  const foundCommand = await get(`${params?.command}`);
  console.log("foundCommand", foundCommand)
  if (foundCommand) {
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
  return get(`${command?.command}`);
};

const update = async (params: Command, user: User): Promise<Command> => {
  if (!params?.uuid) {
    throw new CommandsError("Bad request", BAD_REQUEST);
  }

  const foundCommand = await get(params?.uuid);
  if (!foundCommand) {
    throw new CommandsError("Not found", NOT_FOUND);
  }

  if (!foundCommand?.command) {
    throw new CommandsError("Bad gateway", BAD_GATEWAY);
  }

  if (!hasAuthorization(`${foundCommand?.apiKey}`, user)) {
    throw new CommandsError("Unauthorized", UNAUTHORIZED);
  }

  const timestamp = new Date().getTime();
  const command: Command = {
    ...foundCommand,
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
    Key: { command: foundCommand?.command },
    ExpressionAttributeValues,
    UpdateExpression,
    ExpressionAttributeNames,
  });

  return get(foundCommand?.command);
};

const remove = async (command: string) => {
  await deleteCommand({ TableName: tableCommands, Key: { command } });
};

export default { get, getByUuid, getByApiKey, create, update, remove };

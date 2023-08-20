import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  BAD_GATEWAY,
  INTERNAL_SERVER_ERROR,
  METHOD_NOT_ALLOWED,
  OK,
  NOT_FOUND,
  CREATED,
  NO_CONTENT,
  UNAUTHORIZED,
  FORBIDDEN,
  BAD_REQUEST,
} from "http-status";
import { Command, Role, User } from "../../models";
import commandsDynamoService from "../../services/dynamoCommandsServices";

const hasAuthorization = (user: User): boolean => {
  if (!user?.role) {
    return false;
  }

  return [Role.ROOT, Role.ADMIN].includes(user?.role);
};

const get = async ({ uuid }: { uuid: string }, user: User) => {
  const foundCommand = await commandsDynamoService.getByUuid(uuid);
  if (!foundCommand) {
    return { statusCode: NOT_FOUND };
  }

  if (hasAuthorization(user)) {
    return { statusCode: OK, body: JSON.stringify(foundCommand) };
  }

  const command: Command = {
    command: foundCommand?.command,
    endpoint: foundCommand?.endpoint,
    isEnabled: foundCommand?.isEnabled,
    updatedAt: foundCommand?.updatedAt,
    createdAt: foundCommand?.createdAt,
  };

  return { statusCode: OK, body: JSON.stringify(command) };
};

const post = async (params: Command, user: User) => {
  if (!user?.apiKey) {
    return { statusCode: BAD_REQUEST };
  }

  const command: Command = {
    ...params,
    command: params?.command
      ?.replace(/\//gi, "")
      ?.replace(/-/gi, "_")
      ?.toLowerCase(),
    isEnabled: true,
    apiKey: user?.apiKey,
  };
  const Item = await commandsDynamoService.create(command);
  return { statusCode: CREATED, body: JSON.stringify(Item) };
};

const update = async (params: Command, user: User) => {
  const foundCommand = await commandsDynamoService.update(params, user);

  if (hasAuthorization(user) || foundCommand?.apiKey === user?.apiKey) {
    return { statusCode: OK, body: JSON.stringify(foundCommand) };
  }

  const command: Command = {
    command: foundCommand?.command,
    endpoint: foundCommand?.endpoint,
    isEnabled: foundCommand?.isEnabled,
    updatedAt: foundCommand?.updatedAt,
    createdAt: foundCommand?.createdAt,
  };

  return { statusCode: OK, body: JSON.stringify(command) };
};

const remove = async ({ uuid }: { uuid: string }) => {
  await commandsDynamoService.remove(uuid);
  return { statusCode: NO_CONTENT };
};

export const methods = {
  GET: get,
  POST: post,
  DELETE: remove,
  PUT: update,
  PATCH: update,
};

export const dynamoDBCommandsCrud = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  try {
    const { httpMethod, body: bodyString, pathParameters } = event;
    if (!Object.keys(methods).includes(httpMethod)) {
      return callback(null, { statusCode: METHOD_NOT_ALLOWED });
    }

    if (!bodyString?.trim() && !pathParameters?.id) {
      return callback(null, { statusCode: BAD_GATEWAY });
    }

    const contextCustom = event?.requestContext?.authorizer ?? {};
    const user: User = JSON.parse(contextCustom["Botnorrea-v2"] ?? "{}");

    if (!user?.apiKey) {
      return callback(null, { statusCode: UNAUTHORIZED });
    }

    const body =
      pathParameters && pathParameters?.id
        ? { uuid: pathParameters?.id }
        : JSON.parse(bodyString ?? "{}");
    const response = await methods[httpMethod](body, user);
    return callback(null, { statusCode: OK, ...response });
  } catch (error) {
    console.error(
      `dynamo_users_crud.dynamoDBCommandsCrud: ${error?.message}`,
      error
    );
    return callback(null, {
      statusCode: error?.statusCode ?? INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

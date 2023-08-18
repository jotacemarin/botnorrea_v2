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
} from "http-status";
import { Command, Role, User } from "../../models";
import commandsDynamoService, {
  CommandsError,
} from "../../services/dynamoCommandsService";

const hasAuthorization = (user: User): boolean => {
  if (!user?.role) {
    return false;
  }

  return [Role.ROOT, Role.ADMIN].includes(user?.role);
};

const get = async ({ uuid }: { uuid: string }, user: User) => {
  const { Items } = await commandsDynamoService.getByUuid(uuid);
  if (!Items?.length) {
    return { statusCode: NOT_FOUND };
  }

  if (Items.length > 1) {
    return { statusCode: FORBIDDEN };
  }

  const [Item] = Items;
  if (hasAuthorization(user)) {
    return { statusCode: OK, body: JSON.stringify(Item) };
  }

  const command: Command = {
    command: Item?.command,
    endpoint: Item?.endpoint,
    isEnabled: Item?.isEnabled,
    updatedAt: Item?.updatedAt,
    createdAt: Item?.createdAt,
  };

  return { statusCode: OK, body: JSON.stringify(command) };
};

const post = async (params: JSON | Object | any, user: User) => {
  const command: Command = {
    ...params,
    isEnabled: true,
    apiKey: user?.apiKey,
  };
  const Item = await commandsDynamoService.create(command);
  return { statusCode: CREATED, body: JSON.stringify(Item) };
};

const update = async (params: JSON | Object | any, user: User) => {
  const Item = await commandsDynamoService.update(params, user);

  if (hasAuthorization(user) || Item?.apiKey === user?.apiKey) {
    return { statusCode: OK, body: JSON.stringify(Item) };
  }

  const command: Command = {
    command: Item?.command,
    endpoint: Item?.endpoint,
    isEnabled: Item?.isEnabled,
    updatedAt: Item?.updatedAt,
    createdAt: Item?.createdAt,
  };

  return {
    statusCode: OK,
    body: JSON.stringify(command),
  };
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
      throw new CommandsError("Unauthorized", UNAUTHORIZED);
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

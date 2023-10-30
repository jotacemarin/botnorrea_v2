import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  BAD_GATEWAY,
  CREATED,
  INTERNAL_SERVER_ERROR,
  METHOD_NOT_ALLOWED,
  NOT_FOUND,
  NO_CONTENT,
  OK,
} from "http-status";
import { Role, User } from "../../models";
import usersDynamoService from "../../services/dynamoUsersServices";

const get = async ({ uuid }: { uuid: string | number }) => {
  const Item = await usersDynamoService.get(uuid);
  if (!Item) {
    return { statusCode: NOT_FOUND };
  }

  return { statusCode: OK, body: JSON.stringify(Item) };
};

const post = async (params: User, editAsAdmin: boolean = false) => {
  const Item = await usersDynamoService.create(params, editAsAdmin);
  return { statusCode: CREATED, body: JSON.stringify(Item) };
};

const update = async (params: User, editAsAdmin: boolean = false) => {
  const Item = await usersDynamoService.update(params, editAsAdmin);
  return { statusCode: OK, body: JSON.stringify(Item) };
};

const remove = async ({ uuid }: { uuid: string }) => {
  await usersDynamoService.remove(uuid);
  return { statusCode: NO_CONTENT };
};

export const methods = {
  GET: get,
  POST: post,
  DELETE: remove,
  PUT: update,
  PATCH: update,
};

export const dynamoDBUsersCrud = async (
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
    const canEditAsAdmin =
      user?.role && [Role.ROOT, Role.ADMIN].includes(user?.role);

    let body = {};

    if (pathParameters && pathParameters?.id) {
      body = { uuid: pathParameters?.id };
    }

    if (bodyString && bodyString?.trim() !== "") {
      body = JSON.parse(bodyString);
    }

    const response = await methods[httpMethod](body, canEditAsAdmin);

    return callback(null, { statusCode: OK, ...response });
  } catch (error) {
    console.error(`dynamo_users_crud: ${error?.message}`, error);
    return callback(null, {
      statusCode: error?.statusCode ?? INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

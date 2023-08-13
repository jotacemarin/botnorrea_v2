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
import {
  getCommand,
  putCommand,
  deleteCommand,
  updateCommand,
} from "../../services/dynamodb";
import { buildExpressions } from "../../utils/dynamoDbHelper";
import { randomUUID } from "crypto";

const { DYNAMODB_TABLE_USERS } = process.env;
const tableUsers = `${DYNAMODB_TABLE_USERS}`;

const get = async (
  { uuid }: { uuid: string | number },
  isDirect: boolean = true
) => {
  const { Item } = await getCommand({ TableName: tableUsers, Key: { uuid } });

  if (!Item) {
    return { statusCode: NOT_FOUND };
  }

  return {
    statusCode: OK,
    body: isDirect ? JSON.stringify(Item) : Item,
  };
};

const post = async (
  params: JSON | Object | any,
  editAsAdmin: boolean = false
) => {
  const timestamp = new Date().getTime();
  const user: User = {
    uuid: randomUUID(),
    id: params?.id,
    role: editAsAdmin ? params?.role : Role.USER,
    username: params?.username,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await putCommand({ TableName: tableUsers, Item: user });
  const { body } = await get({ uuid: `${user?.uuid}` }, false);
  return {
    statusCode: CREATED,
    body: JSON.stringify(body),
  };
};

const update = async (
  params: JSON | Object | any,
  editAsAdmin: boolean = false,
  isPatch: boolean = false
) => {
  const { body: currentUser } = await get({ uuid: params?.uuid }, false);
  if (!currentUser || typeof currentUser === "string") {
    return { statusCode: NOT_FOUND };
  }

  const currentRole = currentUser.role ?? Role.USER;
  const timestamp = new Date().getTime();
  const user: User = {
    id: currentUser?.id,
    username: params?.username,
    role: currentRole,
    updatedAt: timestamp,
  };

  if (editAsAdmin) {
    user.id = params?.id;
    user.role = params?.role;
    user.apiKey = params?.apiKey;
  }

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = buildExpressions(user);

  const response = await updateCommand({
    TableName: tableUsers,
    Key: { uuid: currentUser?.uuid },
    ExpressionAttributeValues,
    UpdateExpression,
    ExpressionAttributeNames,
  });

  if (isPatch) {
    return await get({ uuid: currentUser?.uuid });
  }

  return {
    statusCode: OK,
    body: JSON.stringify(response?.Attributes),
  };
};

const remove = async ({ uuid }: { uuid: string }) => {
  await deleteCommand({ TableName: tableUsers, Key: { uuid } });
  return { statusCode: NO_CONTENT };
};

export const methods = {
  GET: get,
  POST: post,
  DELETE: remove,
  PUT: update,
  PATCH: (body: any, editAsAdmin: boolean = false) =>
    update(body, editAsAdmin, true),
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
    const body =
      pathParameters && pathParameters?.id
        ? { uuid: pathParameters?.id }
        : JSON.parse(bodyString ?? "{}");
    const canEditAsAdmin =
      user?.role && [Role.ROOT, Role.ADMIN].includes(user?.role);
    const response = await methods[httpMethod](body, canEditAsAdmin);
    return callback(null, { statusCode: OK, ...response });
  } catch (error) {
    console.error(`dynamo_users_crud.dynamoDBUsersCrud: ${error?.message}`, error);
    return callback(null, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

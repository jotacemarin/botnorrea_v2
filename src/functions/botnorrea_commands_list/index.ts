import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
  UNAUTHORIZED,
} from "http-status";
import { Role, UpdateTg, User } from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import commandsDynamoServices from "../../services/dynamoCommandsService";
import { sendMessage } from "../../services/telegram";

export const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  const { Items: usersItems } = await usersDynamoService.getById(
    body?.message?.from?.id
  );
  if (!usersItems?.length) {
    return { statusCode: NOT_FOUND };
  }

  const [userItem] = usersItems;
  const currentUser: User = await usersDynamoService.get(userItem?.uuid);
  if (!currentUser) {
    return { statusCode: NOT_FOUND };
  }

  if (!currentUser?.apiKey) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "You don't have an API KEY please create one first using the command /create_api_key!",
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: FORBIDDEN };
  }

  const { Items: commandItems } = await commandsDynamoServices.getByApiKey(
    currentUser?.apiKey
  );
  if (!commandItems?.length) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "Not found",
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: NOT_FOUND };
  }

  await sendMessage({
    chat_id: body?.message?.chat?.id,
    text: commandItems
      .map((item) => `${item?.command} - ${item?.description}`)
      .join("\n"),
    reply_to_message_id: body?.message?.message_id,
  });
  return { statusCode: OK };
};

export const botnorreaCommandsList = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  try {
    const { id, apiKey } = event?.queryStringParameters ?? {};

    const botUser = await usersDynamoService.get(`${id}`);
    if (
      !botUser?.role ||
      botUser?.apiKey !== apiKey ||
      ![Role.ROOT, Role.ADMIN].includes(botUser?.role)
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
    console.error(
      `botnorrea_commands_create.botnorreaCommandsCreate: ${error?.message}`,
      error
    );
    return callback(error, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

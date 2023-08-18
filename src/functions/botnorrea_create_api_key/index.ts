import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  OK,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  FORBIDDEN,
  UNAUTHORIZED,
} from "http-status";
import { randomUUID } from "crypto";
import {
  User,
  Role,
  UpdateTg,
  ChatTypeTg,
  FormattingOptionsTg,
} from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import { sendMessage } from "../../services/telegram";

const { BOT_NAME, BOT_DOMAIN } = process.env;

export const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  const { Items } = await usersDynamoService.getById(body?.message?.from?.id);
  if (!Items?.length) {
    return { statusCode: NOT_FOUND };
  }

  const [Item] = Items;
  const currentUser: User = await usersDynamoService.get(Item?.uuid);
  if (!currentUser) {
    return { statusCode: NOT_FOUND };
  }

  if (body?.message?.chat?.type !== ChatTypeTg.PRIVATE) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "Please request your new API KEY in a private message!",
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: FORBIDDEN };
  }

  if (Boolean(currentUser?.apiKey)) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "You already have an API KEY!",
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: FORBIDDEN };
  }

  try {
    const apiKey = randomUUID();
    await usersDynamoService.update({ ...currentUser, apiKey }, true);
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: `Done! You can now add a new commands to ${String(BOT_NAME).replace(/-prod/ig, "")}.

username: <code>${currentUser?.uuid}</code>
password: <code>${apiKey}</code>

Use these username and password as Basic Auth to ${BOT_DOMAIN}/telegram/send-message`, // To do: 🐸🐶☠️ change bot domain
      reply_to_message_id: body?.message?.message_id,
      protect_content: true,
      parse_mode: FormattingOptionsTg.HTML,
    });
  } catch (error) {
    console.error(`botnorrea_create_api_key.execute: ${error?.message}`, error);
    return { statusCode: INTERNAL_SERVER_ERROR };
  }

  return { statusCode: OK };
};

export const botnorreaCreateApiKey = async (
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
      `botnorrea_create_api_key.botnorreaCreateApiKey: ${error?.message}`,
      error
    );
    return callback(error, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

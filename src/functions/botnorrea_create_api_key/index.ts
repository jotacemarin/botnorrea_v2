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

const buildText = (currentUser: User, apiKey: string) => {
  const botName = String(BOT_NAME).replace(/-prod/gi, "");
  return `Done! You can now add a new commands to ${botName}.

username: <code>${currentUser?.uuid}</code>
password: <code>${apiKey}</code>

Use these username and password as Basic Auth to ${BOT_DOMAIN}/telegram/send-message`;
};

export const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  if (body?.message?.chat?.type !== ChatTypeTg.PRIVATE) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "Please request your new API KEY in a private message!",
      reply_to_message_id: body?.message?.message_id,
    });

    return { statusCode: FORBIDDEN };
  }

  const currentUser = await usersDynamoService.getById(body?.message?.from?.id);
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
    const updatedUser = await usersDynamoService.update({ ...currentUser, apiKey }, true);
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: buildText(updatedUser, apiKey),
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

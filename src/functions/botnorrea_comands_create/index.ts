import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
  UNAUTHORIZED,
} from "http-status";
import {
  ChatTypeTg,
  Command,
  FormattingOptionsTg,
  Role,
  UpdateTg,
  User,
} from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import commandsDynamoServices from "../../services/dynamoCommandsService";
import { sendMessage } from "../../services/telegram";

const isUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};

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

  if (!currentUser?.apiKey) {
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: "You don't have an API KEY please create one first using the command /create_api_key!",
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: FORBIDDEN };
  }

  try {
    const parameters = body?.message?.text
      ?.replace(/\/commands_create/gi, "")
      .trim()
      .split(" ");

    if (parameters.length < 2) {
      await sendMessage({
        chat_id: body?.message?.chat?.id,
        text: "Bad request.\n\nCommand usage: <code>/commands_create command_key url description*</code>\n\n<i>*description is optional</i>",
        reply_to_message_id: body?.message?.message_id,
        parse_mode: FormattingOptionsTg.HTML,
      });
      return { statusCode: BAD_REQUEST };
    }

    const [commandKey, endpoint, ...description] = parameters;
    if (!isUrl(endpoint)) {
      await sendMessage({
        chat_id: body?.message?.chat?.id,
        text: "Invalid URL",
        reply_to_message_id: body?.message?.message_id,
      });
      return { statusCode: BAD_REQUEST };
    }

    const command: Command = await commandsDynamoServices.create({
      apiKey: currentUser?.apiKey,
      command: `/${commandKey.replace(/\//gi, "")}`,
      endpoint: endpoint,
      description: description.join(" ") ?? "",
      isEnabled: true,
    });
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: `Command ${command?.command} created successfuly!`,
      reply_to_message_id: body?.message?.message_id,
    });
  } catch (error) {
    console.error(
      `botnorrea_commands_create.execute: ${error?.message}`,
      error
    );
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: `<code>${error?.message}</code>`,
      reply_to_message_id: body?.message?.message_id,
      parse_mode: FormattingOptionsTg.HTML,
    });
    return { statusCode: INTERNAL_SERVER_ERROR };
  }

  return { statusCode: OK };
};

export const botnorreaCommandsCreate = async (
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

import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
  UNAUTHORIZED,
} from "http-status";
import { FormattingOptionsTg, Role, UpdateTg, User } from "../../models";
import usersDynamoService from "../../services/dynamoUsersServices";
import commandsDynamoServices from "../../services/dynamoCommandsServices";
import { sendMessage } from "../../services/telegram";

export const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  try {
    const currentUser = await usersDynamoService.getById(
      body?.message?.from?.id
    );
    if (!currentUser?.apiKey) {
      await sendMessage({
        chat_id: body?.message?.chat?.id,
        text: "You don't have an API KEY please create one first using the command /create_api_key!",
        reply_to_message_id: body?.message?.message_id,
      });

      return { statusCode: FORBIDDEN };
    }

    const commands = await commandsDynamoServices.getByApiKey(
      currentUser?.apiKey
    );
    if (!commands?.length) {
      await sendMessage({
        chat_id: body?.message?.chat?.id,
        text: "Not found",
        reply_to_message_id: body?.message?.message_id,
      });

      return { statusCode: NOT_FOUND };
    }

    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: commands
        .map((item) => `${item?.command} - ${item?.description}`)
        .join("\n"),
      reply_to_message_id: body?.message?.message_id,
    });
    return { statusCode: OK };
  } catch (error) {
    console.error(`botnorrea_commands_list.execute: ${error?.message}`, error);
    await sendMessage({
      chat_id: body?.message?.chat?.id,
      text: `<code>${error?.message}</code>`,
      reply_to_message_id: body?.message?.message_id,
      parse_mode: FormattingOptionsTg.HTML,
    });
    return { statusCode: INTERNAL_SERVER_ERROR };
  }
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
    console.error(`botnorrea_commands_create: ${error?.message}`, error);
    return callback(error, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

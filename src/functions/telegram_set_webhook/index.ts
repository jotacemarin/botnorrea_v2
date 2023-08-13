import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import {
  OK,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
} from "http-status";
import { getWebhookInfo, setWebhook } from "../../services/telegram";
import { Role, User } from "../../models";

export const execute = async (
  url: string
): Promise<{ statusCode: number; body?: string }> => {
  if (!url.trim()) {
    return { statusCode: BAD_REQUEST };
  }

  const webhookOld = await getWebhookInfo();
  const webhookNew = await setWebhook(url);

  const response = JSON.stringify({
    old: webhookOld?.data?.result,
    new: {
      ...webhookNew?.data,
      url,
    },
  });

  return { statusCode: OK, body: response };
};

export const telegramSetWebhook = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  try {
    const contextCustom = event?.requestContext?.authorizer ?? {};
    const user: User = JSON.parse(contextCustom["Botnorrea-v2"] ?? {});
    if (user?.role && ![Role.ROOT, Role.ADMIN].includes(user?.role)) {
      throw new Error("Unauthorized");
    }
  } catch (error) {
    return callback(null, { statusCode: UNAUTHORIZED });
  }

  if (!event?.body) {
    return callback(null, { statusCode: BAD_REQUEST });
  }

  try {
    const { url } = JSON.parse(event?.body);
    const response = await execute(url);
    return callback(null, response);
  } catch (error) {
    console.error(`telegram_set_webhook.telegramSetWebhook: ${error?.message}`, error);
    return callback(error, {
      statusCode: error?.statusCode ?? INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

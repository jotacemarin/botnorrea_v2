import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { getWebhookInfo, setWebhook } from "../../services/telegram";

export const process = async (
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
  if (!event?.body) {
    return callback(null, { statusCode: BAD_REQUEST });
  }

  try {
    const { url } = JSON.parse(event?.body);
    const response = await process(url);
    return callback(null, response);
  } catch (error) {
    return callback(error, {
      statusCode: error?.statusCode ?? INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

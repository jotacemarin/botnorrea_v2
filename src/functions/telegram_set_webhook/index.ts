import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status";
import { getWebhookInfo, setWebhook } from "../../services/telegram";

export const telegramSetWebhook = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  if (!event?.body) {
    return callback(null, { statusCode: BAD_REQUEST });
  }

  const { url } = JSON.parse(event?.body);

  try {
    const webhookOld = await getWebhookInfo();
    const webhookNew = await setWebhook(url);

    const response = JSON.stringify({
      old: webhookOld?.data?.result,
      new: {
        ...webhookNew?.data,
        url,
      },
    });

    return callback(null, { statusCode: OK, body: response });
  } catch (error) {
    return callback(error, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: error.message,
    });
  }
};

import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { OK } from "http-status";

const { BOT_NAME } = process.env;

export const dummy = async (
  event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  const body = JSON.stringify({
    message:
      "Dummy endpoint: Serverless v3.0! Your function executed successfully!",
    botName: BOT_NAME,
    input: event,
  });

  return callback(null, {
    statusCode: OK,
    body,
  });
};

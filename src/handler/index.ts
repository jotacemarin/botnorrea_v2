import { OK } from "http-status";

export const handler = async (event, _context, callback) => {
  const body = JSON.stringify({
    message: "Handler endpoint: Serverless v3.0! Your function executed successfully!",
    input: event,
  });

  return callback(null, {
    statusCode: OK,
    body,
  });
};

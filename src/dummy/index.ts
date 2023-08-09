import { OK } from "http-status";

export const dummy = async (event, _context, callback) => {
  const body = JSON.stringify({
    message: "Dummy endpoint: Serverless v3.0! Your function executed successfully!",
    input: event,
  });

  return callback(null, {
    statusCode: OK,
    body,
  });
};

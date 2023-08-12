import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { randomUUID } from "crypto";
import { NOT_IMPLEMENTED, OK } from "http-status";
import { Role, User } from "../../models";
import { getCommand, putCommand } from "../../services/dynamodb";

const { BOT_NAME, DYNAMODB_TABLE_USERS } = process.env;

export const dummy = async (
  _event: APIGatewayEvent,
  _context: Context,
  callback: Callback
): Promise<void> => {
  try {
    const timestamp = new Date().getTime();
    const id = randomUUID();
    const user: User = {
      id,
      username: id,
      role: Role.ROOT,
      apiKey: id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const data = await putCommand({
      TableName: `${DYNAMODB_TABLE_USERS}`,
      Item: user,
    });
    return callback(null, {
      statusCode: OK,
      body: JSON.stringify({ ...data }),
    });
  } catch (error) {
    return callback(null, {
      statusCode: NOT_IMPLEMENTED,
      body: JSON.stringify({ error: error.message }),
    });
  }
};

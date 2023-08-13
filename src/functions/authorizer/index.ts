import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";
import { User } from "../../models";
import { getCommand } from "../../services/dynamodb";

const { DYNAMODB_TABLE_USERS } = process.env;

export const buildPolicy = (
  methodArn: string,
  Effect: string = "Deny",
  user?: User
) => ({
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect,
        Resource: methodArn,
      },
    ],
  },
  context: {
    "Botnorrea-v2": JSON.stringify(user),
  },
});

export const execute = async (token: string, methodArn: string) => {
  const [id, apiKey] = atob(token).split(":");
  const data = await getCommand({
    TableName: `${DYNAMODB_TABLE_USERS}`,
    Key: { uuid: id },
  });

  const user = data?.Item as User;
  if (user?.apiKey !== apiKey) {
    return buildPolicy(methodArn);
  }

  return buildPolicy(methodArn, "Allow", user);
};

export const authorizer = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const start = new Date().getTime();
  try {
    const [_, basicToken] = event?.authorizationToken?.split(" ");
    return await execute(basicToken, event?.methodArn);
  } catch (error) {
    console.error(`authorizer: ${error?.message}`, error);
    return buildPolicy(event?.methodArn);
  } finally {
    const end = new Date().getTime();
    console.log(`authorizer time: ${end - start}ms`);
  }
};

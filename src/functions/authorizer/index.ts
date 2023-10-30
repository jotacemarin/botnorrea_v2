import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";
import { User } from "../../models";
import usersDynamoService from "../../services/dynamoUsersServices";

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
  const user = await usersDynamoService.getById(id);
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
    const policy = await execute(basicToken, event?.methodArn);
    console.log(`authorizer time: ${Date.now() - start}ms`);
    return policy;
  } catch (error) {
    console.error(`authorizer: ${error?.message}; time: ${Date.now() - start}ms`, error);
    return buildPolicy(event?.methodArn);
  }
};

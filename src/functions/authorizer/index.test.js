import * as dynamobdServices from "../../services/dynamodb";
import { execute, buildPolicy } from "./index";

process.env.DYNAMODB_TABLE_USERS = "users-table";

const user = {
  id: "1234567890",
  apiKey: "1234567890abcdef",
};

const token = btoa(`${user.id}:${user.apiKey}`);

const event = {
  authorizationToken: `Bearer ${token}`,
  methodArn: "arn:aws:execute-api:us-east-1:1234567890:my-api/test/GET/",
};

const expectedPolicy = {
  principalId: "user",
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: "Allow",
        Resource: event.methodArn,
      },
    ],
  },
  context: {
    "Botnorrea-v2": JSON.stringify(user),
  },
};

describe("execute", () => {
  const getCommandSpyOn = jest.spyOn(dynamobdServices, "getCommand");

  beforeAll(() => {
    getCommandSpyOn.mockReturnValue({
      Item: {
        id: "1234567890",
        apiKey: "1234567890abcdef",
      },
    });
  });

  afterAll(() => {
    getCommandSpyOn.mockClear();
    jest.resetAllMocks();
  });

  it("should return a policy with Allow effect if the token is valid", async () => {
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(expectedPolicy);
  });

  it("should return a policy with Deny effect if the token is invalid", async () => {
    const token = "invalidToken";
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(buildPolicy(event.methodArn));
  });

  it("should return a policy with Deny effect if the user does not exist", async () => {
    const token = btoa("1234567890:invalidApiKey");
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(buildPolicy(event.methodArn));
  });
});

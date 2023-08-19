import { execute, buildPolicy } from "./index";
import usersDynamoService from "../../services/dynamoUsersService";

jest.mock("../../services/dynamoUsersService");

describe("execute", () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a policy with Allow effect if the token is valid", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(user);
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(expectedPolicy);
    expect(usersDynamoService.getById).toHaveBeenCalledWith(user.id);
  });

  it("should return a policy with Deny effect if the token is invalid", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(user);
    const token = "invalidToken";
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(buildPolicy(event.methodArn));
    expect(usersDynamoService.getById).toHaveBeenCalled();
  });

  it("should return a policy with Deny effect if the user does not exist", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(user);
    const token = btoa("1234567890:invalidApiKey");
    const result = await execute(token, event.methodArn);
    expect(result).toEqual(buildPolicy(event.methodArn));
    expect(usersDynamoService.getById).toHaveBeenCalled();
  });
});

import { botnorreaCommandsList, execute } from "./index";
import usersDynamoService from "../../services/dynamoUsersServices";
import commandsDynamoServices from "../../services/dynamoCommandsServices";
import { sendMessage } from "../../services/telegram";
import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK,
  UNAUTHORIZED,
} from "http-status";
import { Role } from "../../models";

const logError = jest.spyOn(console, "error").mockImplementation(() => {});
jest.mock("../../services/dynamoUsersServices");
jest.mock("../../services/dynamoCommandsServices");
jest.mock("../../services/telegram");

describe("execute", () => {
  const mockUpdateTgPrivate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
    },
  };

  const mockUserItem = {
    uuid: "mockUserUuid",
    apiKey: "mockApiKey",
  };

  const mockCommandItems = [
    { command: "/command1", description: "Description 1" },
    { command: "/command2", description: "Description 2" },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle user not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(undefined);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle current user not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({});

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle user without apiKey", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({});

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "You don't have an API KEY please create one first using the command /create_api_key!",
      })
    );
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should fetch and send commands", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(result).toEqual({ statusCode: OK });
  });

  it("should fetch and send commands", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockRejectedValueOnce(
      new Error("mock error")
    );

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(result).toEqual({ statusCode: INTERNAL_SERVER_ERROR });
  });

  it("should handle no commands found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce({ Items: [] });

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Not found",
      })
    );
    expect(result).toEqual({ statusCode: NOT_FOUND });
  });
});

describe("botnorreaCommandsList", () => {
  const mockUpdateTgPrivate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
    },
  };

  const mockUserItem = {
    uuid: "mockUserUuid",
    apiKey: "mockApiKey",
  };

  const mockCommandItems = [
    { command: "/command1", description: "Description 1" },
    { command: "/command2", description: "Description 2" },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle a execte internal server error", async () => {
    const mockCallback = jest.fn();
    const mockError = new Error("mock error");
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUserItem,
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);
    sendMessage.mockRejectedValueOnce(mockError);
    sendMessage.mockRejectedValueOnce(mockError);

    await botnorreaCommandsList(
      {
        queryStringParameters: { id: "mockUserId", apiKey: "mockApiKey" },
        body: "{}",
      },
      {},
      mockCallback
    );

    expect(logError).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalled();
  });

  it("should fetch and send commands calling execute function", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUserItem,
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);

    await botnorreaCommandsList(
      {
        queryStringParameters: { id: "mockUserId", apiKey: "mockApiKey" },
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(mockCallback).toHaveBeenCalled();
  });

  it("should handle bad request", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUserItem,
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);

    await botnorreaCommandsList(
      {
        queryStringParameters: { id: "mockUserId", apiKey: "mockApiKey" },
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).not.toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle bad request with empty parameters", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUserItem,
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);

    await botnorreaCommandsList(
      {
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).not.toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle unauthorized", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUserItem,
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.getByApiKey.mockResolvedValueOnce(mockCommandItems);

    await botnorreaCommandsList(
      {
        queryStringParameters: { id: "mockUserId", apiKey: "mockApiKeyFalse" },
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.getByApiKey).not.toHaveBeenCalledWith(
      "mockApiKey"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "/command1 - Description 1\n/command2 - Description 2",
      })
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });
});

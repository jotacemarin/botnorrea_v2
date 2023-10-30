import { botnorreaCommandsRemove, execute } from "./index";
import { ChatTypeTg, Role } from "../../models";
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

const logError = jest.spyOn(console, "error").mockImplementation(() => {});
jest.mock("../../services/dynamoUsersServices");
jest.mock("../../services/dynamoCommandsServices");
jest.mock("../../services/telegram");

describe("execute", () => {
  const mockUpdateTgPrivate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: ChatTypeTg.PRIVATE },
      message_id: "mockMessageId",
      text: "/commands_remove mockCommand",
    },
  };

  const mockUserItem = {
    uuid: "mockUserUuid",
    apiKey: "mockApiKey",
  };

  const mockCommand = {
    command: "/mockCommand",
    apiKey: "mockApiKey",
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should handle user not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce();

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

  it("should handle missing apiKey", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({});
    usersDynamoService.get.mockResolvedValueOnce({ uuid: "mockUserUuid" });

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "You don't have an API KEY please create one first using the command /create_api_key!",
      })
    );
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle command not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(null);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/mockCommand");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand does not exists!`,
      })
    );
    expect(result).toEqual({ statusCode: NOT_FOUND });
  });

  it("should handle unauthorized deletion", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      ...mockUserItem,
      apiKey: "tEst1234",
    });
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Unauthorized, you cannot delete this /mockCommand!`,
      })
    );
    expect(result).toEqual({ statusCode: UNAUTHORIZED });
  });

  it("should handle forbidden", async () => {
    const mockUpdateTgGroup = {
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: ChatTypeTg.GROUP },
        message_id: "mockMessageId",
        text: "/commands_remove mockCommand",
      },
    };
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgGroup);

    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).not.toHaveBeenCalledWith(
      "/mockCommand"
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Please request your new API KEY in a private message!",
      })
    );
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle bad request", async () => {
    const mockUpdateTgPrivateWithoutParams = {
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: ChatTypeTg.PRIVATE },
        message_id: "mockMessageId",
        text: "/commands_remove",
      },
    };

    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgPrivateWithoutParams);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Bad request.\n\nCommand usage: <code>/commands_create command_key url description*</code>\n\n<i>*description is optional</i>",
      })
    );
    expect(commandsDynamoServices.remove).not.toHaveBeenCalledWith(
      "/mockCommand"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );
    expect(result).toEqual({ statusCode: BAD_REQUEST });
  });

  it("should handle internal server error", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);
    commandsDynamoServices.remove.mockRejectedValueOnce(
      new Error("mock error")
    );

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `<code>mock error</code>`,
      })
    );
    expect(result).toEqual({ statusCode: INTERNAL_SERVER_ERROR });
  });

  it("should remove command successfully", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).toHaveBeenCalledWith("/mockCommand");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );
    expect(result).toEqual({ statusCode: OK });
  });
});

describe("botnorreaCommandsRemove", () => {
  const mockUpdateTgPrivate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: ChatTypeTg.PRIVATE },
      message_id: "mockMessageId",
      text: "/commands_remove mockCommand",
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should remove command successfully", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValue({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserid",
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
    });
    commandsDynamoServices.get.mockResolvedValueOnce({
      command: "/mockCommand",
      apiKey: "mockApiKey1",
    });

    await botnorreaCommandsRemove(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey1",
        },
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).toHaveBeenCalledWith("/mockCommand");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );

    expect(mockCallback).toHaveBeenCalledWith(null, { statusCode: OK });
  });

  it("should handle bad request", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValue({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserid",
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
    });
    commandsDynamoServices.get.mockResolvedValueOnce({
      command: "/mockCommand",
      apiKey: "mockApiKey1",
    });

    await botnorreaCommandsRemove(
      {
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).not.toHaveBeenCalledWith(
      "/mockCommand"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle bad request without body", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValue({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserid",
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
    });
    commandsDynamoServices.get.mockResolvedValueOnce({
      command: "/mockCommand",
      apiKey: "mockApiKey1",
    });

    await botnorreaCommandsRemove(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey1",
        },
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).not.toHaveBeenCalledWith(
      "/mockCommand"
    );
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should remove command successfully", async () => {
    const mockCallback = jest.fn();
    const mockError = new Error("mock Error");
    usersDynamoService.get.mockResolvedValue({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
      role: Role.ROOT,
    });
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserid",
      uuid: "mockUserUuid",
      apiKey: "mockApiKey1",
    });
    commandsDynamoServices.get.mockResolvedValueOnce({
      command: "/mockCommand",
      apiKey: "mockApiKey1",
    });
    commandsDynamoServices.remove.mockRejectedValueOnce(mockError);
    sendMessage.mockRejectedValueOnce(mockError);

    await botnorreaCommandsRemove(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey1",
        },
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.remove).toHaveBeenCalledWith("/mockCommand");

    expect(mockCallback).toHaveBeenCalledWith(mockError, {
      statusCode: INTERNAL_SERVER_ERROR,
      body: "mock Error",
    });
  });

  it("should handle unauthorized", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValue({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
      role: Role.ROOT,
    });

    await botnorreaCommandsRemove(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey1",
        },
        body: JSON.stringify(mockUpdateTgPrivate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalled();
    expect(commandsDynamoServices.remove).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });
});

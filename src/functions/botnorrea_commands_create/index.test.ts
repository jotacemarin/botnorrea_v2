// @ts-nocheck

import {
  BAD_REQUEST,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "http-status";
import axios from "axios";
import usersDynamoService from "../../services/dynamoUsersServices";
import commandsDynamoServices from "../../services/dynamoCommandsServices";
import { sendMessage } from "../../services/telegram";
import { botnorreaCommandsCreate, execute } from "./index";

const logError = jest.spyOn(console, "error").mockImplementation(() => {});
jest.mock("axios");
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

  const mockUpdateTgNonPrivate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "group" },
      message_id: "mockMessageId",
    },
  };

  const mockUpdateTgWithApiKey = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
      text: "/commands_create command_key http://example.com Description",
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should handle non-private chat", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
    });

    const result = await execute(mockUpdateTgNonPrivate);

    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Please request your new API KEY in a private message!",
      })
    );
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle user without apiKey", async () => {
    usersDynamoService.getById.mockResolvedValueOnce();

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "You don't have an API KEY please create one first using the command /create_api_key!",
      })
    );
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle bad request with insufficient parameters", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
    });

    const result = await execute({
      message: {
        ...mockUpdateTgWithApiKey.message,
        text: "/commands_create command_key",
        chat: { id: 1, type: "private" },
        message_id: 1,
      },
    });

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Bad request.\n\nCommand usage: <code>/commands_create command_key url description*</code>\n\n<i>*description is optional</i>",
        parse_mode: "HTML",
      })
    );
    expect(result).toEqual({ statusCode: BAD_REQUEST });
  });

  it("should handle invalid URL", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
    });

    const result = await execute({
      message: {
        ...mockUpdateTgWithApiKey.message,
        text: "/commands_create command_key invalid_url",
      },
    });

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Invalid URL",
      })
    );
    expect(result).toEqual({ statusCode: BAD_REQUEST });
  });

  it("should create a command successfully", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
    });
    commandsDynamoServices.create.mockResolvedValueOnce({
      command: "/mockCommand",
    });

    const result = await execute(mockUpdateTgWithApiKey);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "mockApiKey",
        command: "/command_key",
        endpoint: "http://example.com",
        description: "Description",
        isEnabled: true,
      })
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Command /mockCommand created successfuly!",
      })
    );
    expect(result).toEqual({ statusCode: OK });
  });

  it("should create a command successfully without description", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
    });
    commandsDynamoServices.create.mockResolvedValueOnce({
      command: "/mockCommand",
    });

    const result = await execute({
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: "private" },
        message_id: "mockMessageId",
        text: "/commands_create command_key http://example.com",
      },
    });

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "mockApiKey",
        command: "/command_key",
        endpoint: "http://example.com",
        description: "",
        isEnabled: true,
      })
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Command /mockCommand created successfuly!",
      })
    );
    expect(result).toEqual({ statusCode: OK });
  });

  it("should handle internal server error", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserId",
      apiKey: "mockApiKey",
    });
    commandsDynamoServices.create.mockRejectedValueOnce(
      new Error("Mocked error")
    );
    logError.mockImplementationOnce(() => {});

    const result = await execute(mockUpdateTgWithApiKey);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.create).toHaveBeenCalledWith({
      apiKey: "mockApiKey",
      command: "/command_key",
      endpoint: "http://example.com",
      description: "Description",
      isEnabled: true,
    });
    expect(logError).toHaveBeenCalled();
    expect(result).toEqual({ statusCode: INTERNAL_SERVER_ERROR });
  });

  it("should handle bad request error when endpoint to save fails", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      apiKey: "mockApiKey",
    });
    axios.post.mockRejectedValueOnce(new Error("Mocked error"));
    commandsDynamoServices.create.mockResolvedValueOnce({
      command: "/mockCommand",
    });

    const result = await execute(mockUpdateTgWithApiKey);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.create).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Bad request.\n\nYour endpoint throw this message: <code>Mocked error</code>",
      })
    );
    expect(result).toEqual({ statusCode: BAD_REQUEST });
  });
});

describe("botnorreaCommandsCreate", () => {
  const mockUpdateTgWithApiKey = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
      text: "/commands_create command_key http://example.com Description",
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should handle unauthorized", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
    });

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            id: "mockUserId",
            apiKey: "mockApiKey",
          },
          body: "{}",
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  it("should handle bad request without body", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
      apiKey: "mockApiKey",
    });

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            id: "mockUserId",
            apiKey: "mockApiKey",
          },
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle bad request without one string paramater", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
      apiKey: "mockApiKey",
    });

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            apiKey: "mockApiKey",
          },
          body: "{}",
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle bad request without another string paramater", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
      apiKey: "mockApiKey",
    });

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            id: "mockUserId",
          },
          body: "{}",
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle bad request without queryStringParameters", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
    });

    await expect(
      botnorreaCommandsCreate(
        {
          body: "{}",
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle ok status code", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
      apiKey: "mockApiKey",
    });
    usersDynamoService.getById.mockResolvedValueOnce({ apiKey: "mockApiKey" });

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            id: "mockUserId",
            apiKey: "mockApiKey",
          },
          body: JSON.stringify(mockUpdateTgWithApiKey),
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: OK,
    });
  });

  it("should handle internal server error", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      uuid: "mockUserUuid",
      role: "ROOT",
      apiKey: "mockApiKey",
    });
    usersDynamoService.getById.mockResolvedValueOnce({ apiKey: "mockApiKey" });
    mockCallback.mockImplementationOnce(() => {
      throw new Error("Mock callback error");
    });
    mockCallback.mockImplementationOnce(jest.fn());

    await expect(
      botnorreaCommandsCreate(
        {
          queryStringParameters: {
            id: "mockUserId",
            apiKey: "mockApiKey",
          },
          body: JSON.stringify(mockUpdateTgWithApiKey),
        },
        {},
        mockCallback
      )
    ).resolves.toBeUndefined();

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(logError).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});

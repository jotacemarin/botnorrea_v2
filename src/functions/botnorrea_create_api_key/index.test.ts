import {
  OK,
  FORBIDDEN,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
  BAD_REQUEST,
} from "http-status";
import { FormattingOptionsTg, Role } from "../../models";
import usersDynamoService from "../../services/dynamoUsersServices";
import { sendMessage } from "../../services/telegram";
import { botnorreaCreateApiKey, execute } from "./index";

const logError = jest.spyOn(console, "error").mockImplementation(() => {});
jest.mock("../../services/dynamoUsersServices");
jest.mock("../../services/telegram");

describe("execute", () => {
  const mockTelegramUpdate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
    },
  };

  const mockUser = {
    uuid: "mockUserUuid",
    apiKey: null,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should create API key and send message for a valid user", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUser);

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      protect_content: true,
      parse_mode: FormattingOptionsTg.HTML,
      text: expect.any(String),
      reply_to_message_id: "mockMessageId",
    });
    expect(result).toEqual({ statusCode: OK });
  });

  it("should handle already existing API key", async () => {
    const mockTelegramUpdate = {
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: "private" },
        message_id: "mockMessageId",
      },
    };
    const mockUser = {
      uuid: "mockUserUuid",
      apiKey: "existingApiKey",
    };

    usersDynamoService.getById.mockResolvedValueOnce(mockUser);

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      text: "You already have an API KEY!",
      reply_to_message_id: "mockMessageId",
    });
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle already existing API key", async () => {
    const mockTelegramUpdate = {
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: "group" },
        message_id: "mockMessageId",
      },
    };
    const mockUser = { uuid: "mockUserUuid" };

    usersDynamoService.getById.mockResolvedValueOnce(mockUser);

    const result = await execute(mockTelegramUpdate);

    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      text: "Please request your new API KEY in a private message!",
      reply_to_message_id: "mockMessageId",
    });
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle internal server error", async () => {
    usersDynamoService.getById.mockResolvedValueOnce(mockUser);
    usersDynamoService.update.mockRejectedValueOnce(new Error("mock error"));

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(logError).toHaveBeenCalled();
    expect(result).toEqual({ statusCode: INTERNAL_SERVER_ERROR });
  });
});

describe("botnorreaCreateApiKey", () => {
  const mockTelegramUpdate = {
    message: {
      from: { id: "mockUserId" },
      chat: { id: "mockChatId", type: "private" },
      message_id: "mockMessageId",
    },
  };

  const mockUser = {
    uuid: "mockUserUuid",
    apiKey: "mockApiKey",
    role: Role.ROOT,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should create API key and send message for a valid user", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce(mockUser);
    usersDynamoService.getById.mockResolvedValueOnce({ uuid: "mockUserUuid" });

    await botnorreaCreateApiKey(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey",
        },
        body: JSON.stringify(mockTelegramUpdate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      protect_content: true,
      parse_mode: FormattingOptionsTg.HTML,
      text: expect.any(String),
      reply_to_message_id: "mockMessageId",
    });
    expect(mockCallback).toHaveBeenCalledWith(null, { statusCode: OK });
  });

  it("should handle unauthorized", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockRejectedValueOnce(new Error("mock error"));

    await botnorreaCreateApiKey(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey",
        },
        body: JSON.stringify(mockTelegramUpdate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).not.toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  it("should handle unauthorized for missing query parameters", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockRejectedValueOnce(new Error("mock error"));

    await botnorreaCreateApiKey(
      {
        body: JSON.stringify(mockTelegramUpdate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("undefined");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).not.toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  it("should handle bad request", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce(mockUser);
    usersDynamoService.getById.mockResolvedValueOnce(mockUser);

    await botnorreaCreateApiKey(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey",
        },
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).not.toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  it("should handle unauthorized for bad role", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce({
      ...mockUser,
      role: Role.USER,
    });
    usersDynamoService.getById.mockResolvedValueOnce(mockUser);

    await botnorreaCreateApiKey(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey",
        },
        body: JSON.stringify(mockTelegramUpdate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).not.toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).not.toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(sendMessage).not.toHaveBeenCalledWith({
      chat_id: "mockChatId",
      protect_content: true,
      parse_mode: FormattingOptionsTg.HTML,
      text: expect.any(String),
      reply_to_message_id: "mockMessageId",
    });
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  it("should handle internal server error log", async () => {
    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValueOnce(mockUser);
    usersDynamoService.getById.mockResolvedValueOnce({ uuid: "mockUserUuid" });
    mockCallback.mockImplementationOnce(() => {
      throw new Error("mock error");
    });

    await botnorreaCreateApiKey(
      {
        queryStringParameters: {
          id: "mockUserId",
          apiKey: "mockApiKey",
        },
        body: JSON.stringify(mockTelegramUpdate),
      },
      {},
      mockCallback
    );

    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.update).toHaveBeenCalledWith(
      { uuid: "mockUserUuid", apiKey: expect.any(String) },
      true
    );
    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      protect_content: true,
      parse_mode: FormattingOptionsTg.HTML,
      text: expect.any(String),
      reply_to_message_id: "mockMessageId",
    });
    expect(logError).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});

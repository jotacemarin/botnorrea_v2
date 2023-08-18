import { OK, FORBIDDEN, NOT_FOUND } from "http-status";
import { FormattingOptionsTg } from "../../models";
import usersDynamoService from "../../services/dynamoUsersService";
import { sendMessage } from "../../services/telegram";
import { execute } from "./index";

jest.mock("../../services/dynamoUsersService");
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
  });

  it("should create API key and send message for a valid user", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUser] });
    usersDynamoService.get.mockResolvedValueOnce(mockUser);

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.get).toHaveBeenCalledWith("mockUserUuid");
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

    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUser] });
    usersDynamoService.get.mockResolvedValueOnce(mockUser);

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

    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUser] });
    usersDynamoService.get.mockResolvedValueOnce(mockUser);

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(sendMessage).toHaveBeenCalledWith({
      chat_id: "mockChatId",
      text: "Please request your new API KEY in a private message!",
      reply_to_message_id: "mockMessageId",
    });
    expect(result).toEqual({ statusCode: FORBIDDEN });
  });

  it("should handle when user does not exists", async () => {
    const mockTelegramUpdate = {
      message: {
        from: { id: "mockUserId" },
        chat: { id: "mockChatId", type: "group" },
        message_id: "mockMessageId",
      },
    };

    usersDynamoService.getById.mockResolvedValueOnce({ Items: [] });
    usersDynamoService.get.mockResolvedValueOnce(undefined);

    const result = await execute(mockTelegramUpdate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.get).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: NOT_FOUND });
  });
});

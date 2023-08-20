import { execute } from "./index";
import { BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from "http-status";
import usersDynamoService from "../../services/dynamoUsersService";
import commandsDynamoServices from "../../services/dynamoCommandsService";
import { sendMessage } from "../../services/telegram";
import axios from "axios";


const logError = jest.spyOn(console, "error").mockImplementation(() => {});
jest.mock("axios");
jest.mock("../../services/dynamoUsersService");
jest.mock("../../services/dynamoCommandsService");
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

  it("should handle internal server error", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({
      id: "mockUserId",
      apiKey: "mockApiKey",
    });
    commandsDynamoServices.create.mockRejectedValueOnce(
      new Error("Mocked error")
    );

    const result =  await execute(mockUpdateTgWithApiKey);

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
    axios.post.mockRejectedValueOnce(
      new Error("Mocked error")
    );
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

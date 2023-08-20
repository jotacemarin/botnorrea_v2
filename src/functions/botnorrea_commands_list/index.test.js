import { execute } from "./index";
import usersDynamoService from "../../services/dynamoUsersService";
import commandsDynamoServices from "../../services/dynamoCommandsService";
import { sendMessage } from "../../services/telegram";
import { FORBIDDEN, NOT_FOUND, OK } from "http-status";

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

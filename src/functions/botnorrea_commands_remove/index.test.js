import { execute } from "./index"; // Replace with the actual path to your module
import { ChatTypeTg } from "../../models";
import usersDynamoService from "../../services/dynamoUsersService"; // Replace with the actual path to your usersDynamoService module
import commandsDynamoServices from "../../services/dynamoCommandsService"; // Replace with the actual path to your commandsDynamoServices module
import { sendMessage } from "../../services/telegram"; // Replace with the actual path to your telegram module
import { FORBIDDEN, NOT_FOUND, OK, UNAUTHORIZED } from "http-status";

jest.mock("../../services/dynamoUsersService");
jest.mock("../../services/dynamoCommandsService");
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
  });

  it("should handle user not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [] });

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(result).toEqual({ statusCode: NOT_FOUND });
  });

  it("should handle current user not found", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [{}] });
    usersDynamoService.get.mockResolvedValueOnce(null);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(usersDynamoService.get).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({ statusCode: NOT_FOUND });
  });

  it("should handle missing apiKey", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUserItem] });
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
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUserItem] });
    usersDynamoService.get.mockResolvedValueOnce(mockUserItem);
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
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUserItem] });
    usersDynamoService.get.mockResolvedValueOnce({ ...mockUserItem, apiKey: "tEst1234" });
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/mockCommand");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Unauthorized, you cannot delete this /mockCommand!`,
      })
    );
    expect(result).toEqual({ statusCode: UNAUTHORIZED });
  });

  it("should remove command successfully", async () => {
    usersDynamoService.getById.mockResolvedValueOnce({ Items: [mockUserItem] });
    usersDynamoService.get.mockResolvedValueOnce(mockUserItem);
    commandsDynamoServices.get.mockResolvedValueOnce(mockCommand);

    const result = await execute(mockUpdateTgPrivate);

    expect(usersDynamoService.getById).toHaveBeenCalledWith("mockUserId");
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/mockCommand");
    expect(commandsDynamoServices.remove).toHaveBeenCalledWith("/mockCommand");
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: `Command /mockCommand removed successfuly!`,
      })
    );
    expect(result).toEqual({ statusCode: OK });
  });

  // Add more test cases for other scenarios
});

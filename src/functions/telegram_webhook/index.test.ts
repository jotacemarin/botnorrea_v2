import axios from "axios";
import { OK } from "http-status";
import usersDynamoService from "../../services/dynamoUsersServices";
import groupsDynamoServices from "../../services/dynamoGroupsServices";
import commandsDynamoServices from "../../services/dynamoCommandsServices";
import { EntityTypeTg, Role } from "../../models";
import { execute, telegramWebhook } from "./index";

jest.mock("axios");
jest.mock("../../services/dynamoUsersServices");
jest.mock("../../services/dynamoGroupsServices");
jest.mock("../../services/dynamoCommandsServices");

describe("should execute putUser and putGroup functions and make axios post request", () => {
  const mockBody = {
    update_id: 1,
    message: {
      message_id: 1,
      from: {
        id: "test1",
        is_bot: false,
        first_name: "test",
        last_name: "test",
        username: "test",
        language_code: "test",
      },
      chat: {
        id: "test1",
        title: "test",
        type: "test",
        all_members_are_administrators: false,
      },
      date: 1,
      text: "/command_test test",
      entities: [
        {
          offset: 0,
          length: 13,
          type: EntityTypeTg.BOT_COMMAND,
        },
      ],
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("execute happy path with command", async () => {
    const mockUser = { username: "mockUsername" };
    const mockGroup = { title: "mockTitle" };
    usersDynamoService.getById.mockResolvedValue(mockUser);
    usersDynamoService.update.mockResolvedValue(mockUser);
    groupsDynamoServices.getById.mockResolvedValue(mockGroup);
    groupsDynamoServices.update.mockResolvedValue(mockGroup);
    commandsDynamoServices.get.mockResolvedValue({
      endpoint: "http://test.com",
    });

    await expect(execute(mockBody)).resolves.toEqual({ statusCode: OK });
    expect(usersDynamoService.getById).toHaveBeenCalledWith("test1");
    expect(usersDynamoService.update).toHaveBeenCalledWith({
      username: "test",
    });
    expect(groupsDynamoServices.getById).toHaveBeenCalledWith("test1");
    expect(groupsDynamoServices.update).toHaveBeenCalledWith({ title: "test" });
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/command_test");
    expect(axios.post).toHaveBeenCalledWith("http://test.com", mockBody);
  });

  it("execute happy path with command and creating entities", async () => {
    const mockUser = { username: "mockUsername" };
    const mockGroup = { title: "mockTitle" };
    usersDynamoService.getById.mockResolvedValue();
    usersDynamoService.create.mockResolvedValue(mockUser);
    groupsDynamoServices.getById.mockResolvedValue();
    groupsDynamoServices.create.mockResolvedValue(mockGroup);
    commandsDynamoServices.get.mockResolvedValue({
      endpoint: "http://test.com",
    });

    await expect(execute(mockBody)).resolves.toEqual({ statusCode: OK });
    expect(usersDynamoService.getById).toHaveBeenCalledWith("test1");
    expect(usersDynamoService.create).toHaveBeenCalledWith({
      id: "test1",
      is_bot: false,
      first_name: "test",
      last_name: "test",
      username: "test",
      language_code: "test",
    });
    expect(groupsDynamoServices.getById).toHaveBeenCalledWith("test1");
    expect(groupsDynamoServices.create).toHaveBeenCalledWith({
      id: "test1",
      title: "test",
      type: "test",
      all_members_are_administrators: false,
    });
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/command_test");
    expect(axios.post).toHaveBeenCalledWith("http://test.com", mockBody);
  });

  it("execute happy path with command but from bot", async () => {
    const mockBodyFromBot = {
      update_id: 1,
      message: {
        message_id: 1,
        from: {
          id: "test1",
          is_bot: true,
          first_name: "test",
          last_name: "test",
          username: "test",
          language_code: "test",
        },
        chat: {
          id: "test1",
          title: "test",
          type: "test",
          all_members_are_administrators: false,
        },
        date: 1,
        text: "/command_test test",
        entities: [
          {
            offset: 0,
            length: 13,
            type: EntityTypeTg.BOT_COMMAND,
          },
        ],
      },
    };

    const mockUser = { username: "mockUsername" };
    const mockGroup = { title: "mockTitle" };
    usersDynamoService.getById.mockResolvedValue(mockUser);
    usersDynamoService.update.mockResolvedValue(mockUser);
    groupsDynamoServices.getById.mockResolvedValue(mockGroup);
    groupsDynamoServices.update.mockResolvedValue(mockGroup);

    await expect(execute(mockBodyFromBot)).resolves.toEqual({ statusCode: OK });
    expect(usersDynamoService.getById).toHaveBeenCalledWith("test1");
    expect(usersDynamoService.update).toHaveBeenCalledWith({
      username: "test",
    });
    expect(groupsDynamoServices.getById).toHaveBeenCalledWith("test1");
    expect(groupsDynamoServices.update).toHaveBeenCalledWith({ title: "test" });
    expect(commandsDynamoServices.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("execute happy path without valid command", async () => {
    const mockBodyWithoutCommand = {
      update_id: 1,
      message: {
        message_id: 1,
        from: {
          id: "test1",
          is_bot: false,
          first_name: "test",
          last_name: "test",
          username: "test",
          language_code: "test",
        },
        chat: {
          id: "test1",
          title: "test",
          type: "test",
          all_members_are_administrators: false,
        },
        date: 1,
        text: "test /command_test",
        entities: [
          {
            offset: 6,
            length: 18,
            type: "",
          },
        ],
      },
    };

    const mockUser = { username: "mockUsername" };
    const mockGroup = { title: "mockTitle" };
    usersDynamoService.getById.mockResolvedValue(mockUser);
    usersDynamoService.update.mockResolvedValue(mockUser);
    groupsDynamoServices.getById.mockResolvedValue(mockGroup);
    groupsDynamoServices.update.mockResolvedValue(mockGroup);
    commandsDynamoServices.get.mockResolvedValue({
      endpoint: "http://test.com",
    });

    await expect(execute(mockBodyWithoutCommand)).resolves.toEqual({
      statusCode: OK,
    });
    expect(usersDynamoService.getById).toHaveBeenCalledWith("test1");
    expect(usersDynamoService.update).toHaveBeenCalledWith({
      username: "test",
    });
    expect(groupsDynamoServices.getById).toHaveBeenCalledWith("test1");
    expect(groupsDynamoServices.update).toHaveBeenCalledWith({ title: "test" });
    expect(commandsDynamoServices.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe("should handle telegramWebhook function", () => {
  const mockBody = {
    update_id: 1,
    message: {
      message_id: 1,
      from: {
        id: "test1",
        is_bot: false,
        first_name: "test",
        last_name: "test",
        username: "test",
        language_code: "test",
      },
      chat: {
        id: "test1",
        title: "test",
        type: "test",
        all_members_are_administrators: false,
      },
      date: 1,
      text: "/command_test test",
      entities: [
        {
          offset: 0,
          length: 13,
          type: EntityTypeTg.BOT_COMMAND,
        },
      ],
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("execute happy path with command", async () => {
    const mockUser = { username: "mockUsername" };
    const mockGroup = { title: "mockTitle" };

    const mockCallback = jest.fn();
    usersDynamoService.get.mockResolvedValue({
      ...mockUser,
      role: Role.ROOT,
      apiKey: "test",
    });
    usersDynamoService.getById.mockResolvedValue(mockUser);
    usersDynamoService.update.mockResolvedValue(mockUser);
    groupsDynamoServices.getById.mockResolvedValue(mockGroup);
    groupsDynamoServices.update.mockResolvedValue(mockGroup);
    commandsDynamoServices.get.mockResolvedValue({
      endpoint: "http://test.com",
    });

    await telegramWebhook(
      {
        queryStringParameters: { id: 1, apiKey: "test" },
        body: JSON.stringify(mockBody),
      },
      {},
      mockCallback
    );
    expect(usersDynamoService.get).toHaveBeenCalledWith("1");
    expect(usersDynamoService.getById).toHaveBeenCalledWith("test1");
    expect(usersDynamoService.update).toHaveBeenCalledWith({
      username: "test",
    });
    expect(groupsDynamoServices.getById).toHaveBeenCalledWith("test1");
    expect(groupsDynamoServices.update).toHaveBeenCalledWith({ title: "test" });
    expect(commandsDynamoServices.get).toHaveBeenCalledWith("/command_test");
    expect(axios.post).toHaveBeenCalledWith("http://test.com", mockBody);
  });
});

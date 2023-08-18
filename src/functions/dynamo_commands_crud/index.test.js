import { OK, NOT_FOUND, CREATED, NO_CONTENT } from "http-status";
import commandsDynamoService from "../../services/dynamoCommandsService";
import { Role } from "../../models";
import { methods } from "./index";

jest.mock("../../services/dynamoCommandsService");

describe("methods", () => {
  const mockUser = { apiKey: "mockApiKey", role: Role.USER };
  const mockItem = {
    command: "mockCommand",
    endpoint: "mockEndpoint",
    updatedAt: "2023-08-14T00:00:00Z",
    createdAt: "2023-08-14T00:00:00Z",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle GET method with no items", async () => {
    commandsDynamoService.getByUuid.mockResolvedValueOnce({ Items: [] });

    await expect(methods.GET({ uuid: "mockId" }, mockUser)).resolves.toEqual({
      statusCode: NOT_FOUND,
    });
  });

  it("should handle POST method with no items", async () => {
    commandsDynamoService.create.mockResolvedValueOnce(mockItem);

    await expect(methods.POST({ uuid: "mockId" }, mockUser)).resolves.toEqual({
      statusCode: CREATED,
      body: JSON.stringify(mockItem),
    });
  });

  it("should handle PUT method with authorization", async () => {
    const mockUser = { apiKey: "mockApiKey", role: Role.ROOT };
    const mockItem = {
      command: "mockCommand",
      endpoint: "mockEndpoint",
      updatedAt: "2023-08-14T00:00:00Z",
      createdAt: "2023-08-14T00:00:00Z",
      apiKey: "mockApiKey",
    };
    commandsDynamoService.update.mockResolvedValueOnce(mockItem);

    const result = await methods.PUT({}, mockUser);

    expect(commandsDynamoService.update).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: OK,
      body: JSON.stringify(mockItem),
    });
  });

  it("should handle PUT method with insufficient authorization", async () => {
    const mockUser = { apiKey: "otherApiKey", role: Role.USER };
    const mockItem = {
      command: "mockCommand",
      endpoint: "mockEndpoint",
      updatedAt: "2023-08-14T00:00:00Z",
      createdAt: "2023-08-14T00:00:00Z",
      apiKey: "mockApiKey",
    };
    commandsDynamoService.update.mockResolvedValueOnce(mockItem);

    const result = await methods.PUT({}, mockUser);

    expect(commandsDynamoService.update).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: OK,
      body: JSON.stringify({
        command: "mockCommand",
        endpoint: "mockEndpoint",
        updatedAt: "2023-08-14T00:00:00Z",
        createdAt: "2023-08-14T00:00:00Z",
      }),
    });
  });

  it("should handle PUT method with forbidden access", async () => {
    const mockUser = { apiKey: "otherApiKey", role: Role.USER };
    const mockItem = {
      command: "mockCommand",
      endpoint: "mockEndpoint",
      updatedAt: "2023-08-14T00:00:00Z",
      createdAt: "2023-08-14T00:00:00Z",
      apiKey: "otherApiKey",
    };
    commandsDynamoService.update.mockResolvedValueOnce(mockItem);

    const result = await methods.PUT({}, mockUser);

    expect(commandsDynamoService.update).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: OK,
      body: JSON.stringify({
        ...mockItem,
        command: "mockCommand",
        endpoint: "mockEndpoint",
        updatedAt: "2023-08-14T00:00:00Z",
        createdAt: "2023-08-14T00:00:00Z",
      }),
    });
  });

  it("should handle GET method with valid data and authorization", async () => {
    commandsDynamoService.remove.mockResolvedValueOnce(undefined);

    await expect(methods.DELETE({ uuid: "mockId" }, mockUser)).resolves.toEqual(
      {
        statusCode: NO_CONTENT,
      }
    );
  });
});

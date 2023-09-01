import {
  OK,
  NOT_FOUND,
  CREATED,
  NO_CONTENT,
  BAD_REQUEST,
  METHOD_NOT_ALLOWED,
  BAD_GATEWAY,
  UNAUTHORIZED,
} from "http-status";
import commandsDynamoService from "../../services/dynamoCommandsServices";
import { Role } from "../../models";
import { dynamoDBCommandsCrud, methods } from "./index";

jest.mock("../../services/dynamoCommandsServices");

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
    commandsDynamoService.getByUuid.mockResolvedValueOnce();

    await expect(methods.GET({ uuid: "mockId" }, mockUser)).resolves.toEqual({
      statusCode: NOT_FOUND,
    });
  });

  it("should handle GET method without authorization", async () => {
    const mockCommand = {
      command: "test",
      endpoint: "test",
      isEnabled: "test",
      updatedAt: "test",
      createdAt: "test",
    };
    commandsDynamoService.getByUuid.mockResolvedValueOnce(mockCommand);

    await expect(
      methods.GET({ uuid: "mockId" }, { apiKey: "mockApiKey" })
    ).resolves.toEqual({
      statusCode: OK,
      body: JSON.stringify(mockCommand),
    });
  });

  it("should handle GET method", async () => {
    const mockCommand = {
      command: "test",
      endpoint: "test",
      isEnabled: "test",
      updatedAt: "test",
      createdAt: "test",
    };
    commandsDynamoService.getByUuid.mockResolvedValueOnce(mockCommand);

    await expect(methods.GET({ uuid: "mockId" }, mockUser)).resolves.toEqual({
      statusCode: OK,
      body: JSON.stringify(mockCommand),
    });
  });

  it("should handle GET method with full authorization", async () => {
    const mockCommand = {
      command: "test",
      endpoint: "test",
      isEnabled: "test",
      updatedAt: "test",
      createdAt: "test",
    };
    commandsDynamoService.getByUuid.mockResolvedValueOnce(mockCommand);

    await expect(
      methods.GET({ uuid: "mockId" }, { ...mockUser, role: Role.ROOT })
    ).resolves.toEqual({
      statusCode: OK,
      body: JSON.stringify(mockCommand),
    });
  });

  it("should handle POST method with no items", async () => {
    commandsDynamoService.create.mockResolvedValueOnce(mockItem);

    await expect(methods.POST({ uuid: "mockId" }, mockUser)).resolves.toEqual({
      statusCode: CREATED,
      body: JSON.stringify(mockItem),
    });
  });

  it("should handle POST method and handle bad request", async () => {
    commandsDynamoService.create.mockResolvedValueOnce(mockItem);

    await expect(
      methods.POST({ uuid: "mockId" }, { role: Role.USER })
    ).resolves.toEqual({
      statusCode: BAD_REQUEST,
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

describe("dynamoDBCommandsCrud", () => {
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

  it("should handle HEAD and respond method not allowed", async () => {
    const mockCallback = jest.fn();

    await dynamoDBCommandsCrud({ httpMethod: "HEAD" }, {}, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: METHOD_NOT_ALLOWED,
    });
  });

  it("should handle POST and respond bad gateway", async () => {
    const mockCallback = jest.fn();

    await dynamoDBCommandsCrud({ httpMethod: "POST" }, {}, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_GATEWAY,
    });
  });

  it("should handle POST without request context", async () => {
    const mockCallback = jest.fn();

    await dynamoDBCommandsCrud(
      { httpMethod: "POST", body: '{"test":1}', pathParameters: { id: 1 } },
      {},
      mockCallback
    );

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  it("should handle POST with request context", async () => {
    const mockCallback = jest.fn();
    commandsDynamoService.create.mockResolvedValueOnce(mockItem);

    await dynamoDBCommandsCrud(
      {
        httpMethod: "POST",
        body: '{"command":"/test"}',
        requestContext: { authorizer: { "Botnorrea-v2": '{"apiKey": 123}' } },
      },
      {},
      mockCallback
    );

    expect(commandsDynamoService.create).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: CREATED,
      body: JSON.stringify(mockItem),
    });
  });

  it("should handle GET with request context", async () => {
    const mockCallback = jest.fn();
    commandsDynamoService.getByUuid.mockResolvedValueOnce(mockItem);

    await dynamoDBCommandsCrud(
      {
        httpMethod: "GET",
        pathParameters: { id: 1 },
        requestContext: { authorizer: { "Botnorrea-v2": '{"apiKey": 123}' } },
      },
      {},
      mockCallback
    );

    expect(commandsDynamoService.getByUuid).toHaveBeenCalledWith(1);
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: OK,
      body: JSON.stringify(mockItem),
    });
  });

  it("should handle POST respond internal server error", async () => {
    const mockCallback = jest.fn();
    commandsDynamoService.create.mockResolvedValueOnce(mockItem);
    mockCallback.mockImplementationOnce(() => {
      throw new Error("Mock callback error");
    });
    mockCallback.mockImplementationOnce(jest.fn());

    await dynamoDBCommandsCrud(
      {
        httpMethod: "POST",
        body: '{"command":"/test"}',
        requestContext: { authorizer: { "Botnorrea-v2": '{"apiKey": 123}' } },
      },
      {},
      mockCallback
    );

    expect(commandsDynamoService.create).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});

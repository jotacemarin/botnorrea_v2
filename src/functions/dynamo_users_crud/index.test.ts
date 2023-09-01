process.env.DYNAMODB_TABLE_USERS = "users-table";

import {
  BAD_GATEWAY,
  CREATED,
  METHOD_NOT_ALLOWED,
  NOT_FOUND,
  NO_CONTENT,
  OK,
  UNAUTHORIZED,
} from "http-status";
import { Role } from "../../models";
import * as dynamobdServices from "../../services/dynamodb";
import { dynamoDBUsersCrud, methods } from "./index";

const { GET: get, POST: post, PATCH: update, DELETE: remove } = methods;

const getSpy = jest.spyOn(dynamobdServices, "getCommand");
const putSpy = jest.spyOn(dynamobdServices, "putCommand");
const updateSpy = jest.spyOn(dynamobdServices, "updateCommand");
const deleteSpy = jest.spyOn(dynamobdServices, "deleteCommand");

const getTestUser = {
  uuid: "1234567890",
  id: "1234567890",
  username: "test_user",
  role: Role.USER,
  createdAt: new Date().getTime(),
  updatedAt: new Date().getTime(),
};

const postTestUser = {
  uuid: "1234567891",
  id: "1234567891",
  username: "new_user",
  role: Role.USER,
};

const updateTestUser = {
  uuid: "1234567890",
  id: "1234567890",
  username: "updated_user",
  role: Role.ADMIN,
};

describe("get", () => {
  afterEach(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  it("should return a 200 OK response with the user data", async () => {
    const event = {
      httpMethod: "GET",
      queryStringParameters: {
        id: getTestUser.id,
      },
    };

    getSpy.mockResolvedValue({ Item: getTestUser });

    const result = await get(event.queryStringParameters);

    expect(result.statusCode).toBe(OK);
    expect(result.body).toBe(JSON.stringify(getTestUser));
    expect(getSpy).toHaveBeenCalled();
  });

  it("should return a 404 Not Found response if the user does not exist", async () => {
    const event = {
      httpMethod: "GET",
      queryStringParameters: {
        id: "invalid_id",
      },
    };

    getSpy.mockResolvedValue({ Item: undefined });

    const result = await get(event.queryStringParameters);

    expect(result.statusCode).toBe(NOT_FOUND);
    expect(result.body).toBe(undefined);
    expect(getSpy).toHaveBeenCalled();
  });
});

describe("post", () => {
  afterEach(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  it("should return a 201 Created response with the user data", async () => {
    putSpy.mockResolvedValue({ Item: postTestUser });
    getSpy.mockResolvedValueOnce({ Item: postTestUser });

    const result = await post(postTestUser, true);

    expect(result.statusCode).toBe(CREATED);
    expect(result.body).toBe(JSON.stringify(postTestUser));
    expect(putSpy).toHaveBeenCalled();
  });
});

describe("update", () => {
  afterEach(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  it("should return a 200 OK response with the updated user data", async () => {
    getSpy.mockResolvedValueOnce({ Item: getTestUser });
    updateSpy.mockResolvedValue({ Attributes: updateTestUser });
    getSpy.mockResolvedValueOnce({ Item: updateTestUser });

    const result = await update(updateTestUser, true);

    expect(result.statusCode).toBe(OK);
    expect(result.body).toBe(JSON.stringify(updateTestUser));
    expect(updateSpy).toHaveBeenCalled();
  });

  it("should return a 200 OK response with the updated user data", async () => {
    getSpy.mockResolvedValueOnce({ Item: getTestUser });
    updateSpy.mockResolvedValue({ Attributes: updateTestUser });
    getSpy.mockResolvedValueOnce({ Item: updateTestUser });

    const result = await update(updateTestUser);

    expect(result.statusCode).toBe(OK);
    expect(result.body).toBe(JSON.stringify(updateTestUser));
    expect(updateSpy).toHaveBeenCalled();
  });
});

describe("delete", () => {
  afterEach(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  afterAll(() => {
    getSpy.mockClear();
    jest.resetAllMocks();
  });

  it("should return a 204 NO_CONTENT", async () => {
    const event = {
      httpMethod: "DELETE",
      queryStringParameters: {
        id: getTestUser.id,
      },
    };

    deleteSpy.mockResolvedValue(undefined);

    const result = await remove(event.queryStringParameters);

    expect(result.statusCode).toBe(NO_CONTENT);
    expect(result.body).toBeUndefined();
    expect(deleteSpy).toHaveBeenCalled();
  });
});

describe("dynamoDBUsersCrud", () => {
  const mockUser = {
    uuid: "1234567890",
    id: "1234567890",
    username: "test_user",
    role: Role.USER,
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle HEAD and respond method not allowed", async () => {
    const mockCallback = jest.fn();

    await dynamoDBUsersCrud({ httpMethod: "HEAD" }, {}, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: METHOD_NOT_ALLOWED,
    });
  });

  it("should handle POST and respond bad gateway", async () => {
    const mockCallback = jest.fn();

    await dynamoDBUsersCrud({ httpMethod: "POST" }, {}, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_GATEWAY,
    });
  });

  it("should handle GET without request context", async () => {
    const mockCallback = jest.fn();
    getSpy.mockResolvedValueOnce({ Item: postTestUser });

    await dynamoDBUsersCrud(
      {
        httpMethod: "GET",
        pathParameters: { id: 1 },
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"USER"}' } },
      },
      {},
      mockCallback
    );

    expect(getSpy).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: OK,
      body: JSON.stringify(postTestUser),
    });
  });

  it("should handle POST without request context", async () => {
    const mockCallback = jest.fn();
    putSpy.mockResolvedValue({ Item: postTestUser });
    getSpy.mockResolvedValueOnce({ Item: postTestUser });

    await dynamoDBUsersCrud(
      {
        httpMethod: "POST",
        body: '{"test":1}',
      },
      {},
      mockCallback
    );

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: CREATED,
      body: JSON.stringify(postTestUser),
    });
  });

  it("should handle POST with request context", async () => {
    const mockCallback = jest.fn();
    putSpy.mockResolvedValue({ Item: postTestUser });
    getSpy.mockResolvedValueOnce({ Item: postTestUser });

    await dynamoDBUsersCrud(
      {
        httpMethod: "POST",
        body: '{"test":1}',
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"USER"}' } },
      },
      {},
      mockCallback
    );

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: CREATED,
      body: JSON.stringify(postTestUser),
    });
  });

  it("should handle POST with request context but handle internal server error", async () => {
    const mockCallback = jest.fn();
    putSpy.mockResolvedValue({ Item: postTestUser });
    getSpy.mockResolvedValueOnce({ Item: postTestUser });
    mockCallback.mockImplementationOnce(() => {
      throw new Error("Mock callback error");
    });
    mockCallback.mockImplementationOnce(jest.fn());

    await dynamoDBUsersCrud(
      {
        httpMethod: "POST",
        body: '{"test":1}',
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"USER"}' } },
      },
      {},
      mockCallback
    );

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});

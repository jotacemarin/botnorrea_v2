process.env.DYNAMODB_TABLE_USERS = "users-table";

import { CREATED, NOT_FOUND, NO_CONTENT, OK } from "http-status";
import { Role, User } from "../../models";
import * as dynamobdServices from "../../services/dynamodb";
import { methods } from "./index";

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

    const result = await update(updateTestUser, true, true);

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

// @ts-nocheck

import * as dynamobdServices from "./dynamodb";
import groupsCommandsService from "./dynamoCommandsServices";

process.env.DYNAMODB_TABLE_COMMANDS = "Commands-Groups";

const getSpy = jest.spyOn(dynamobdServices, "getCommand");
const putSpy = jest.spyOn(dynamobdServices, "putCommand");
const updateSpy = jest.spyOn(dynamobdServices, "updateCommand");
const scanSpy = jest.spyOn(dynamobdServices, "scanCommand");
const deleteSpy = jest.spyOn(dynamobdServices, "deleteCommand");

const paramsTest = {
  uuid: 123,
  command: "commandMock",
  endpoint: "endpointMock",
  description: "descriptionMock",
  isEnabled: true,
  apiKey: "apiKeyMock",
};

describe("DynamoDB commands", () => {
  beforeEach(() => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should execute get", async () => {
    await expect(groupsCommandsService.get("test")).resolves.toBeTruthy();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute getByUuid", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [paramsTest] }))
    );

    await expect(groupsCommandsService.getByUuid(123)).resolves.toBeTruthy();
  });

  it("should execute getByApiKey", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [paramsTest] }))
    );

    await expect(
      groupsCommandsService.getByApiKey("apiKeyMock")
    ).resolves.toEqual([paramsTest]);
  });

  it("should execute create", async () => {
    getSpy.mockImplementationOnce(jest.fn(() => Promise.resolve({})));
    putSpy.mockImplementation(jest.fn());
    getSpy.mockImplementationOnce(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );

    await expect(
      groupsCommandsService.create(paramsTest)
    ).resolves.toBeTruthy();

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsCommandsService.update(paramsTest, {
        apiKey: "apiKeyMock",
        role: "ROOT",
      })
    ).resolves.toBeTruthy();

    expect(updateSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute remove", async () => {
    deleteSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsCommandsService.remove(paramsTest?.command)
    ).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalled();
  });
});

describe("DynamoDb getByUuid fails", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return undefined when not found any element", async () => {
    scanSpy.mockImplementation(jest.fn(() => Promise.resolve({ Items: [] })));

    await expect(groupsCommandsService.getByUuid(123)).resolves.toBeUndefined();
  });

  it("should execute getByUuid throws Unprocessable entity", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [{}, {}] }))
    );

    await expect(groupsCommandsService.getByUuid(123)).rejects.toThrowError(
      "Unprocessable entity"
    );
  });
});

describe("DynamoDb create fails", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute update throws ", async () => {
    getSpy.mockImplementation(jest.fn(() => Promise.resolve({ Item: {} })));

    await expect(groupsCommandsService.create(paramsTest)).rejects.toThrowError(
      "Forbidden"
    );

    expect(getSpy).toHaveBeenCalled();
  });
});

describe("DynamoDb update fails", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute update throws Bad request", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));
    const userParamsTest = { ...paramsTest, uuid: undefined };

    await expect(
      groupsCommandsService.update(userParamsTest, false)
    ).rejects.toThrowError("Bad request");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("should execute update throws Not found", async () => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: undefined }))
    );
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsCommandsService.update(paramsTest, {})
    ).rejects.toThrowError("Not found");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Bad gateway", async () => {
    getSpy.mockImplementation(
      jest.fn(() =>
        Promise.resolve({ Item: { ...paramsTest, command: undefined } })
      )
    );
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsCommandsService.update(paramsTest, {})
    ).rejects.toThrowError("Bad gateway");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Unauthorized by api key", async () => {
    getSpy.mockImplementation(
      jest.fn(() =>
        Promise.resolve({ Item: { ...paramsTest, apiKey: "test" } })
      )
    );

    await expect(
      groupsCommandsService.update(paramsTest, {})
    ).rejects.toThrowError("Unauthorized");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Unauthorized by role", async () => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );

    await expect(
      groupsCommandsService.update(paramsTest, {
        apiKey: paramsTest?.apiKey,
        role: "mockRole",
      })
    ).rejects.toThrowError("Unauthorized");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Unauthorized by role undefined", async () => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );

    await expect(
      groupsCommandsService.update(paramsTest, {})
    ).rejects.toThrowError("Unauthorized");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });
});

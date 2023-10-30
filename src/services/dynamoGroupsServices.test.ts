// @ts-nocheck

import * as dynamobdServices from "./dynamodb";
import groupsDynamoService from "./dynamoGroupsServices";

process.env.DYNAMODB_TABLE_GROUPS = "Table-Groups";

const getSpy = jest.spyOn(dynamobdServices, "getCommand");
const putSpy = jest.spyOn(dynamobdServices, "putCommand");
const updateSpy = jest.spyOn(dynamobdServices, "updateCommand");
const scanSpy = jest.spyOn(dynamobdServices, "scanCommand");

const paramsTest = { uuid: 123, id: 123, title: "test" };

describe("DynamoDB commands", () => {
  beforeEach(() => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute get", async () => {
    await expect(groupsDynamoService.get("test")).resolves.toBeTruthy();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute getById", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [paramsTest] }))
    );

    await expect(groupsDynamoService.getById(123)).resolves.toBeTruthy();
  });

  it("should execute getById returns undefined", async () => {
    scanSpy.mockImplementation(jest.fn(() => Promise.resolve({ Items: [] })));

    await expect(groupsDynamoService.getById(123)).resolves.toBeUndefined();
  });

  it("should execute getById throws Unprocessable entity", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [{}, {}] }))
    );

    await expect(groupsDynamoService.getById(123)).rejects.toThrowError(
      "Unprocessable entity"
    );
  });

  it("should execute create", async () => {
    putSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );

    await expect(
      groupsDynamoService.create(paramsTest, false)
    ).resolves.toBeTruthy();

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsDynamoService.update(paramsTest, false)
    ).resolves.toBeTruthy();

    expect(updateSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Bad request", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));
    const userParamsTest = { ...paramsTest, uuid: undefined };

    await expect(
      groupsDynamoService.update(userParamsTest, false)
    ).rejects.toThrowError("Bad request");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });
});

describe("DynamoDb update fails", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute update throws Not found", async () => {
    getSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: undefined }))
    );
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsDynamoService.update(paramsTest, false)
    ).rejects.toThrowError("Not found");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Bad gateway", async () => {
    getSpy.mockImplementation(
      jest.fn(() =>
        Promise.resolve({ Item: { ...paramsTest, uuid: undefined } })
      )
    );
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsDynamoService.update(paramsTest, false)
    ).rejects.toThrowError("Bad gateway");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });
});

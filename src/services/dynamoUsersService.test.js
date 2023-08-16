import * as dynamobdServices from "./dynamodb";
import usersDynamoService from "./dynamoUsersService";

process.env.DYNAMODB_TABLE_USERS = "Table-Users";

const getSpy = jest.spyOn(dynamobdServices, "getCommand");
const putSpy = jest.spyOn(dynamobdServices, "putCommand");
const updateSpy = jest.spyOn(dynamobdServices, "updateCommand");
const deleteSpy = jest.spyOn(dynamobdServices, "deleteCommand");
const scanSpy = jest.spyOn(dynamobdServices, "scanCommand");

const paramsTest = { uuid: 123, id: 123, role: "test", username: "test" };

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
    await expect(usersDynamoService.get("test")).resolves.toBeTruthy();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute create", async () => {
    putSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Item: paramsTest }))
    );

    await expect(
      usersDynamoService.create(paramsTest, false)
    ).resolves.toBeTruthy();

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      usersDynamoService.update(paramsTest, false)
    ).resolves.toBeTruthy();

    expect(updateSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update throws Bad request", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));
    const userParamsTest = { ...paramsTest, uuid: undefined };

    await expect(
      usersDynamoService.update(userParamsTest, false)
    ).rejects.toThrowError("Bad request");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("should execute remove", async () => {
    deleteSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(usersDynamoService.remove(123)).resolves.toBeUndefined();
  });

  it("should execute getById", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [paramsTest] }))
    );

    await expect(usersDynamoService.getById(123)).resolves.toBeTruthy();
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
      usersDynamoService.update(paramsTest, false)
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
      usersDynamoService.update(paramsTest, false)
    ).rejects.toThrowError("Bad gateway");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });
});

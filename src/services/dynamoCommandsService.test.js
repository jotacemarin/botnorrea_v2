import * as dynamobdServices from "./dynamodb";
import groupsCommandsService from "./dynamoCommandsService";

process.env.DYNAMODB_TABLE_COMMANDS = "Commands-Groups";

const getSpy = jest.spyOn(dynamobdServices, "getCommand");
const putSpy = jest.spyOn(dynamobdServices, "putCommand");
const updateSpy = jest.spyOn(dynamobdServices, "updateCommand");
const scanSpy = jest.spyOn(dynamobdServices, "scanCommand");

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

  it("should execute create", async () => {
    getSpy.mockImplementationOnce(jest.fn(() => Promise.resolve({})));
    // scanSpy.mockImplementationOnce(jest.fn(() => Promise.resolve({ Items: [] })));
    // getSpy.mockImplementationOnce(jest.fn(() => Promise.resolve()));
    putSpy.mockImplementation(jest.fn());
    getSpy.mockImplementationOnce(jest.fn(() => Promise.resolve({ Item: paramsTest })));

    await expect(
      groupsCommandsService.create(paramsTest)
    ).resolves.toBeTruthy();

    expect(putSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });

  it("should execute update", async () => {
    updateSpy.mockImplementation(jest.fn(() => Promise.resolve()));

    await expect(
      groupsCommandsService.update(paramsTest, { apiKey: "apiKeyMock" })
    ).resolves.toBeTruthy();

    expect(updateSpy).toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
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

  it("should execute getByUuid", async () => {
    scanSpy.mockImplementation(
      jest.fn(() => Promise.resolve({ Items: [paramsTest] }))
    );

    await expect(groupsCommandsService.getByUuid(123)).resolves.toBeTruthy();
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
      groupsCommandsService.update(paramsTest, false)
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
      groupsCommandsService.update(paramsTest, false)
    ).rejects.toThrowError("Bad gateway");

    expect(updateSpy).not.toHaveBeenCalled();
    expect(getSpy).toHaveBeenCalled();
  });
});

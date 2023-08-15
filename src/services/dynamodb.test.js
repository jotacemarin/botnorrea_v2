import {
  scanCommand,
  queryCommand,
  getCommand,
  putCommand,
  updateCommand,
  deleteCommand,
} from "./dynamodb"; // Replace with the actual path to your module

// Mock DynamoDBClient and DynamoDBDocumentClient
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn(() => ({
        Items: [{ id: 1, name: "Item 1" }],
      })),
    })),
  },
  ScanCommand: jest.fn(),
  QueryCommand: jest.fn(),
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
}));

describe("DynamoDB commands", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute scanCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await scanCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });

  it("should execute queryCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await queryCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });

  it("should execute getCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await getCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });

  it("should execute putCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await putCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });

  it("should execute updateCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await updateCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });

  it("should execute deleteCommand", async () => {
    const mockResult = { Items: [{ id: 1, name: "Item 1" }] };
    const result = await deleteCommand({ TableName: "MockTable" });
    expect(result).toEqual(mockResult);
  });
});

import { execute } from "./index";
import usersDynamoService from "../../services/dynamoUsersService";
import groupsDynamoServices from "../../services/dynamoGroupsServices";

jest.mock("axios");

const usersGetByIdSpy = jest.spyOn(usersDynamoService, "getById");
const usersCreateSpy = jest.spyOn(usersDynamoService, "create");
const usersUpdateSpy = jest.spyOn(usersDynamoService, "update");
const groupsGetByIdSpy = jest.spyOn(groupsDynamoServices, "getById");
const groupsCreateSpy = jest.spyOn(groupsDynamoServices, "create");
const groupsUpdateSpy = jest.spyOn(groupsDynamoServices, "update");

describe("should execute putUser and putGroup functions and make axios post request", () => {
  const mockFrom = { uuid: 123, id: 123, username: "testuser" };
  const mockChat = { id: 456, title: "Test Group" };
  const mockBody = { message: { from: mockFrom, chat: mockChat } };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("group and user exists", async () => {
    usersGetByIdSpy.mockResolvedValue({ Items: [mockFrom] });
    usersUpdateSpy.mockResolvedValue(mockFrom);
    groupsGetByIdSpy.mockResolvedValue({ Items: [mockChat] });
    groupsUpdateSpy.mockResolvedValue(mockChat);

    const result = await execute(mockBody);

    expect(usersGetByIdSpy).toHaveBeenCalled();
    expect(usersUpdateSpy).toHaveBeenCalled();
    expect(groupsGetByIdSpy).toHaveBeenCalled();
    expect(groupsUpdateSpy).toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 200 });
  });

  it("group and user does not exits", async () => {
    usersGetByIdSpy.mockResolvedValue({ Items: [] });
    usersCreateSpy.mockResolvedValue(mockFrom);
    groupsGetByIdSpy.mockResolvedValue({ Items: [] });
    groupsCreateSpy.mockResolvedValue(mockChat);

    const result = await execute(mockBody);

    expect(usersGetByIdSpy).toHaveBeenCalled();
    expect(usersCreateSpy).toHaveBeenCalled();
    expect(groupsGetByIdSpy).toHaveBeenCalled();
    expect(groupsCreateSpy).toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 200 });
  });
});

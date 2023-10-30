import { BAD_REQUEST, OK, UNAUTHORIZED } from "http-status";
import { execute, telegramSetWebhook } from "./index";
import * as telegramServices from "../../services/telegram";

describe("Services respond successfully", () => {
  const getWebhookInfoSpyOn = jest.spyOn(telegramServices, "getWebhookInfo");
  const setWebhookSpyOn = jest.spyOn(telegramServices, "setWebhook");

  beforeEach(() => {
    getWebhookInfoSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: {
          url: "test",
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 0,
          ip_address: "127.0.0.1",
        },
      },
    });
    setWebhookSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: true,
        description: "Webhook is already set",
      },
    });
  });

  afterEach(() => {
    getWebhookInfoSpyOn.mockClear();
    setWebhookSpyOn.mockClear();
    jest.resetAllMocks();
  });

  test("Happy path", async () => {
    await expect(execute("test")).resolves.toEqual({
      statusCode: OK,
      body: JSON.stringify({
        old: {
          url: "test",
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 0,
          ip_address: "127.0.0.1",
        },
        new: {
          ok: true,
          result: true,
          description: "Webhook is already set",
          url: "test",
        },
      }),
    });
    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).toHaveBeenCalled();
  });

  test("URL is empty string", async () => {
    await expect(execute("")).resolves.toEqual({
      statusCode: BAD_REQUEST,
    });

    expect(setWebhookSpyOn).not.toHaveBeenCalled();
  });
});

describe("getWebhookInfo respond failed", () => {
  const getWebhookInfoSpyOn = jest.spyOn(telegramServices, "getWebhookInfo");
  const setWebhookSpyOn = jest.spyOn(telegramServices, "setWebhook");

  beforeAll(() => {
    getWebhookInfoSpyOn.mockImplementation(() => {
      throw new Error();
    });
    setWebhookSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: true,
        description: "Webhook is already set",
      },
    });
  });

  afterAll(() => {
    getWebhookInfoSpyOn.mockClear();
    setWebhookSpyOn.mockClear();
    jest.resetAllMocks();
  });

  test("getWebhookInfo respond failed", async () => {
    await expect(execute("test")).rejects.toThrow();
    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).not.toHaveBeenCalled();
  });
});

describe("setWebhookSpyOn respond failed", () => {
  const getWebhookInfoSpyOn = jest.spyOn(telegramServices, "getWebhookInfo");
  const setWebhookSpyOn = jest.spyOn(telegramServices, "setWebhook");

  beforeAll(() => {
    getWebhookInfoSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: {
          url: "test",
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 0,
          ip_address: "127.0.0.1",
        },
      },
    });
    setWebhookSpyOn.mockImplementation(() => {
      throw new Error();
    });
  });

  afterAll(() => {
    getWebhookInfoSpyOn.mockClear();
    setWebhookSpyOn.mockClear();
    jest.resetAllMocks();
  });

  test("getWebhookInfo respond failed", async () => {
    await expect(execute("test")).rejects.toThrow();
    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).toHaveBeenCalled();
  });
});

describe("telegramSetWebhook respond successfully", () => {
  const getWebhookInfoSpyOn = jest.spyOn(telegramServices, "getWebhookInfo");
  const setWebhookSpyOn = jest.spyOn(telegramServices, "setWebhook");

  beforeEach(() => {
    getWebhookInfoSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: {
          url: "test",
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 0,
          ip_address: "127.0.0.1",
        },
      },
    });
    setWebhookSpyOn.mockReturnValue({
      data: {
        ok: true,
        result: true,
        description: "Webhook is already set",
      },
    });
  });

  afterEach(() => {
    getWebhookInfoSpyOn.mockClear();
    setWebhookSpyOn.mockClear();
    jest.resetAllMocks();
  });

  test("Handle telegramSetWebhook unauthorized", async () => {
    const mockCallback = jest.fn();
    await telegramSetWebhook(
      {
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"USER"}' } },
      },
      {},
      mockCallback
    );

    expect(getWebhookInfoSpyOn).not.toHaveBeenCalled();
    expect(setWebhookSpyOn).not.toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });

  test("Handle telegramSetWebhook bad request", async () => {
    const mockCallback = jest.fn();
    await telegramSetWebhook(
      {
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"ROOT"}' } },
      },
      {},
      mockCallback
    );

    expect(getWebhookInfoSpyOn).not.toHaveBeenCalled();
    expect(setWebhookSpyOn).not.toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: BAD_REQUEST,
    });
  });

  test("Handle telegramSetWebhook ok", async () => {
    const mockCallback = jest.fn();
    await telegramSetWebhook(
      {
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"ROOT"}' } },
        body: '{"url":"http://test.com"}',
      },
      {},
      mockCallback
    );

    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: OK,
      body: JSON.stringify({
        old: {
          url: "test",
          has_custom_certificate: false,
          pending_update_count: 0,
          max_connections: 0,
          ip_address: "127.0.0.1",
        },
        new: {
          ok: true,
          result: true,
          description: "Webhook is already set",
          url: "http://test.com",
        },
      }),
    });
  });

  test("Handle telegramSetWebhook internal server error", async () => {
    const mockCallback = jest.fn();
    mockCallback.mockImplementationOnce(() => {
      throw new Error("Mock callback error");
    });
    mockCallback.mockImplementationOnce(jest.fn());
    await telegramSetWebhook(
      {
        requestContext: { authorizer: { "Botnorrea-v2": '{"role":"ROOT"}' } },
        body: '{"url":"http://test.com"}',
      },
      {},
      mockCallback
    );

    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  test("Handle telegramSetWebhook without request contest", async () => {
    const mockCallback = jest.fn();
    await telegramSetWebhook(
      {
        body: '{"url":"http://test.com"}',
      },
      {},
      mockCallback
    );

    expect(getWebhookInfoSpyOn).not.toHaveBeenCalled();
    expect(setWebhookSpyOn).not.toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(null, {
      statusCode: UNAUTHORIZED,
    });
  });
});

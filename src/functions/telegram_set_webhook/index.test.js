import { BAD_REQUEST, OK } from "http-status";
import { process as telegramSetWebhook } from "./index";
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
    await expect(telegramSetWebhook("test")).resolves.toEqual({
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
    await expect(telegramSetWebhook("")).resolves.toEqual({
      statusCode: BAD_REQUEST,
    });
    // expect(getWebhookInfoSpyOn).not.toHaveBeenCalled();
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
    await expect(telegramSetWebhook("test")).rejects.toThrow();
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
    await expect(telegramSetWebhook("test")).rejects.toThrow();
    expect(getWebhookInfoSpyOn).toHaveBeenCalled();
    expect(setWebhookSpyOn).toHaveBeenCalled();
  });
});
// @ts-nocheck

import {
  filterCommandEntity,
  hasCommand,
  getCommandKey,
} from "./telegramHelper"; // Replace with the actual path to your module
import { EntityTypeTg } from "../models"; // Assuming this is the path to your models

describe("filterCommandEntity", () => {
  it("should filter BOT_COMMAND entity type with offset 0", () => {
    const entity = { type: EntityTypeTg.BOT_COMMAND, offset: 0 };
    const result = filterCommandEntity(entity);
    expect(result).toBe(true);
  });

  it("should not filter other entity types", () => {
    const entity = { type: "mockTypeEntity", offset: 0 };
    const result = filterCommandEntity(entity);
    expect(result).toBe(false);
  });

  it("should not filter BOT_COMMAND entity type with non-zero offset", () => {
    const entity = { type: EntityTypeTg.BOT_COMMAND, offset: 1 };
    const result = filterCommandEntity(entity);
    expect(result).toBe(false);
  });
});

describe("hasCommand", () => {
  it("should return true if message contains BOT_COMMAND entity", () => {
    const body = {
      message: {
        entities: [{ type: EntityTypeTg.BOT_COMMAND, offset: 0 }],
      },
    };
    const result = hasCommand(body);
    expect(result).toBe(true);
  });

  it("should return false if message does not contain BOT_COMMAND entity", () => {
    const body = {
      message: {
        entities: [{ type: "mockTypeEntity", offset: 0 }],
      },
    };
    const result = hasCommand(body);
    expect(result).toBe(false);
  });

  it("should return false if message entities array is empty", () => {
    const body = {
      message: {
        entities: [],
      },
    };
    const result = hasCommand(body);
    expect(result).toBe(false);
  });

  it("should return false if message is undefined", () => {
    const body = {};
    const result = hasCommand(body);
    expect(result).toBe(false);
  });
});

describe("getCommandKey", () => {
  it("should return offset and length of BOT_COMMAND entity", () => {
    const body = {
      message: {
        entities: [{ type: EntityTypeTg.BOT_COMMAND, offset: 3, length: 6 }],
      },
    };
    const result = getCommandKey(body);
    expect(result).toEqual({ offset: 0, length: 0 });
  });

  it("should return offset and length of BOT_COMMAND entity when is valid command position", () => {
    const body = {
      message: {
        entities: [{ type: EntityTypeTg.BOT_COMMAND, offset: 0, length: 6 }],
      },
    };
    const result = getCommandKey(body);
    expect(result).toEqual({ offset: 0, length: 6 });
  });

  it("should return default offset and length if entities array is empty", () => {
    const body = {
      message: {
        entities: [],
      },
    };
    const result = getCommandKey(body);
    expect(result).toEqual({ offset: 0, length: 0 });
  });

  it("should return default offset and length if message is undefined", () => {
    const body = {};
    const result = getCommandKey(body);
    expect(result).toEqual({ offset: 0, length: 0 });
  });
});

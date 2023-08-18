import { TelegramEntityType, TelegramUpdate } from "../models";

export const filterCommandEntity = ({ type, offset }) =>
  type === TelegramEntityType.BOT_COMMAND && offset === 0;

export const hasCommand = (body: TelegramUpdate) => {
  const commands = body?.message?.entities?.filter(filterCommandEntity);
  return Boolean(commands?.length);
};

export const getCommandKey = (
  body: TelegramUpdate
): { offset: number; length: number } => {
  const commands = body?.message?.entities?.filter(filterCommandEntity);
  if (!commands?.length) {
    return { offset: 0, length: 0 };
  }

  const [{ offset, length }] = commands;
  return { offset, length };
};

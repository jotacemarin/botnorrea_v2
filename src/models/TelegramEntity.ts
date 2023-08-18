import { TelegramEntityType } from "./TelegramEntityType";

export interface TelegramEntity {
  offset: number;
  length: number;
  type: TelegramEntityType;
}

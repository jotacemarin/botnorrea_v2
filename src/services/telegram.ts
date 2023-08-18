import axios, { AxiosResponse } from "axios";
import { EntityTg, UserTg } from "../models";

const { TELEGRAM_BOT_TOKEN } = process.env;

const telegramService = axios.create({
  baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`,
});

export const setWebhook = async (
  url: string
): Promise<
  AxiosResponse<{
    ok: boolean;
    result: boolean;
    description: string;
  }>
> => await telegramService.post("/setWebhook", { url });

export const getWebhookInfo = async (): Promise<
  AxiosResponse<{
    ok: boolean;
    result: {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      max_connections: number;
      ip_address: string;
    };
  }>
> => await telegramService.get("/getWebhookInfo");

export const sendMessage = async (params: {
  chat_id: number | string;
  message_thread_id?: number;
  text: string;
  parse_mode?: string;
  entities?: Array<EntityTg>;
  reply_to_message_id?: number;
  reply_markup?: any;
}): Promise<
  AxiosResponse<{
    message_id: number;
    message_thread_id: number;
    from: UserTg;
    sender_chat: any;
    date: number;
    entities: Array<EntityTg>;
  }>
> => await telegramService.post("/sendMessage", params);

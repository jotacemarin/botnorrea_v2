import axios, { AxiosResponse } from "axios";

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

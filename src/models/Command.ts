export interface Command {
  uuid?: string;
  command?: string;
  endpoint?: string;
  isEnabled?: boolean;
  apiKey?: string;
  createdAt?: number;
  updatedAt?: number;
}

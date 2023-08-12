import { Role } from "./Roles";

export interface User {
  id: string;
  username: string;
  apiKey?: string | undefined | null;
  role?: Role;
  createdAt?: number;
  updatedAt: number;
}

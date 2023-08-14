import { Role } from "./Roles";

export interface User {
  uuid?: string | number;
  id?: string | number;
  username?: string;
  apiKey?: string | undefined | null;
  role?: Role;
  createdAt?: number;
  updatedAt?: number;
}

export enum Role {
  ROOT = "ROOT",
  ADMIN = "ADMIN",
  USER = "USER",
  SERVICE = "SERVICE",
}

export interface Command {
  uuid?: string;
  command?: string;
  endpoint?: string;
  isEnabled?: boolean;
  apiKey?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Group {
  uuid?: string | number;
  id?: string | number;
  title?: string;
  users?: Array<string>;
  createdAt?: number;
  updatedAt?: number;
}

export interface User {
  uuid?: string | number;
  id?: string | number;
  username?: string;
  apiKey?: string | undefined | null;
  role?: Role;
  createdAt?: number;
  updatedAt?: number;
}

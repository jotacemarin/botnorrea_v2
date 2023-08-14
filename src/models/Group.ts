export interface Group {
  uuid?: string | number;
  id?: string | number;
  title?: string;
  users?: Array<string>;
  createdAt?: number;
  updatedAt?: number;
}

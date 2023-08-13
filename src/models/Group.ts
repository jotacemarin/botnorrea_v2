export interface Group {
  uuid?: string | number;
  id?: string | number;
  title?: string;
  users?: Array<string>;
  listeners?: Array<any>;
  createdAt?: number;
  updatedAt: number;
}

import type { Sql } from 'sql-template-tag';

export type SqlTag<T> = Sql & {
  _columns: T;
};

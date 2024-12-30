import type { Sql } from 'sql-template-tag';

export type TaggedSql<T> = Sql & {
  _columns: T;
};

import type { PlainObject } from '@httpx/assert';
import type { RawBuilder, SelectQueryBuilder } from 'kysely';

export type QueryBuilder<TDatabase> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | SelectQueryBuilder<TDatabase, any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | RawBuilder<any>;

export type IGetQuery<TDatabase> = {
  getQuery: <TParams extends Record<string | number | symbol, unknown>>(
    params: TParams
  ) => QueryBuilder<TDatabase>;
};

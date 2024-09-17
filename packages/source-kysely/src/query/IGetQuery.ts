import type { RawBuilder, SelectQueryBuilder } from 'kysely';

export type QueryBuilder<TDatabase> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | SelectQueryBuilder<TDatabase, any, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | RawBuilder<unknown>;

export type IGetQuery<TDatabase> = {
  getQuery: <TParams extends Record<string | number | symbol, unknown>>(
    params: TParams
  ) => QueryBuilder<TDatabase>;
};

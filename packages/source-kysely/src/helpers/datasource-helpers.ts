import type {
  QueryResult,
  QueryResultError,
  QueryResultMeta,
  QueryResultSuccess,
} from '@flowblade/core';
import type { Jsonify } from 'type-fest';

export type JsonifiedDataSourceResponse<
  T extends QueryResult<Record<string, unknown>[]>,
> = {
  success: true | false;
  data: Jsonify<QueryResultSuccess<unknown[]>>;
  meta?: QueryResultMeta;
  error?: QueryResultError;
};

export const DatasourceHelpers = {
  toJsonified: <T extends QueryResult<Record<string, unknown>[]>>(
    queryResponse: T
  ) => {
    return queryResponse as unknown as JsonifiedDataSourceResponse<T>;
  },
};

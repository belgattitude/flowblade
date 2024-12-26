import type {
  QueryResultError,
  QueryResultMeta,
  QueryResultSuccess,
} from './query-result';

export const createResultSuccess = <TData extends unknown[]>(
  data: TData,
  meta: QueryResultMeta
): QueryResultSuccess<TData> => ({
  success: true,
  data,
  meta,
});

export const createResultError = (
  error: QueryResultError['error'],
  meta?: QueryResultError['meta']
): QueryResultError => ({
  success: false,
  error: {
    ...error,
    message: `Query failed: ${error.message}`,
  },
  ...(meta === undefined ? {} : { meta }),
});

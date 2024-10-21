import type {
  QueryResultError,
  QueryResultMeta,
  QueryResultSuccess,
} from './query-result';

export const createResultSuccess = <T>(
  data: T,
  meta: QueryResultMeta
): QueryResultSuccess<T> => ({
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

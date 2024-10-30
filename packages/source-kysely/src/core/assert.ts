import type {
  QueryResult,
  QueryResultError,
  QueryResultSuccess,
} from './query-result';

export const isQueryResultSuccess = <TData extends unknown[]>(
  result: QueryResult<TData>
): result is QueryResultSuccess<TData> => {
  return result.success === true;
};

export const isQueryResultError = (
  result: QueryResult<unknown[]>
): result is QueryResultError => {
  return result.success === false;
};

export function assertQueryResultSuccess<TData extends unknown[]>(
  result: QueryResult<TData>
): asserts result is QueryResultSuccess<TData> {
  if (!isQueryResultSuccess(result)) {
    throw new TypeError(`Datasource query failed: ${result.error.message}`);
  }
}

export function assertQueryResultError(
  result: QueryResult<unknown[]>
): asserts result is QueryResultError {
  if (!isQueryResultError(result)) {
    throw new TypeError(`Not a query error`);
  }
}

import type {
  QueryResult,
  QueryResultError,
  QueryResultSuccess,
} from './query-result';

export const isQueryResultSuccess = <TQuery>(
  result: QueryResult<TQuery>
): result is QueryResultSuccess<TQuery> => {
  return result.success === true;
};

export const isQueryResultError = (
  result: QueryResult<unknown>
): result is QueryResultError => {
  return result.success === false;
};

export function assertQueryResultSuccess<TQuery>(
  result: QueryResult<TQuery>
): asserts result is QueryResultSuccess<TQuery> {
  if (!isQueryResultSuccess(result)) {
    throw new TypeError(`Datasource query failed: ${result.error.message}`);
  }
}

export function assertQueryResultError(
  result: QueryResult<unknown>
): asserts result is QueryResultError {
  if (!isQueryResultError(result)) {
    throw new TypeError(`Not a query error`);
  }
}

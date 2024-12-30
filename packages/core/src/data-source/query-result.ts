type SqlQueryAndParams = {
  sql?: string;
  params?: unknown[];
};

export type QueryResultMeta = {
  query?: SqlQueryAndParams;
  timeMs?: number | undefined;
  /**
   * This is defined for insert, update, delete and merge queries and contains
   * the number of rows the query inserted/updated/deleted.
   */
  affectedRows?: number | undefined;
};

export type QueryResultSuccess<TData extends unknown[]> = {
  success: true;
  data: TData;
  meta?: QueryResultMeta;
};

export type QueryResultError = {
  success: false;
  error: {
    message: string;
  };
  meta?: QueryResultMeta;
};

export type QueryResult<TData extends unknown[]> =
  | QueryResultSuccess<TData>
  | QueryResultError;

export type AsyncQueryResult<TData extends unknown[]> = Promise<
  QueryResult<TData>
>;

/**
 * Infer the data type (TData) from a QueryResult<TData>
 *
 * @example
 * ```typescript
 * type Row = { id: number };
 * const queryResult: QueryResult<Row[]> = {
 *   success: true,
 *   data: [ { id: 1 } ],
 * };
 * type TData = InferQueryResultData<typeof queryResult>;
 * ```
 */
export type InferQueryResultData<T extends QueryResult<unknown[]>> =
  T extends QueryResultSuccess<unknown[]> ? T['data'] : never;

/**
 * Infer the data type (TData) from an AsyncQueryResult<TData>
 *
 * @example
 * ```typescript
 * type Row = { id: number };
 * const getQueryResult = async (): AsyncQueryResult<Row[]> => {
 *   return {
 *    success: true,
 *    data: [{ id: 1 }],
 *   };
 * };
 * type TData = InferAsyncQueryResultData<ReturnType<typeof getQueryResult>>;
 * // TData = Row[]
 * ```
 */

export type InferAsyncQueryResultData<T> =
  T extends Promise<infer P>
    ? P extends QueryResultSuccess<unknown[]>
      ? P['data']
      : never
    : never;

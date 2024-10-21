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

export type QueryResultSuccess<TQuery> = {
  success: true;
  data: TQuery;
  meta?: QueryResultMeta;
};

export type QueryResultError = {
  success: false;
  error: {
    message: string;
  };
  meta?: QueryResultMeta;
};

export type QueryResult<TQuery> = QueryResultSuccess<TQuery> | QueryResultError;

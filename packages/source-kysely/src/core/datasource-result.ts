export type DatasourceResultMeta = {
  query?: {
    sql?: string;
    params?: unknown[];
  };
  timeMs?: number | undefined;
  /**
   * This is defined for insert, update, delete and merge queries and contains
   * the number of rows the query inserted/updated/deleted.
   */
  affectedRows?: number | undefined;
};

export type DatasourceResult<TQuery> = {
  data: TQuery;
  meta?: DatasourceResultMeta;
};

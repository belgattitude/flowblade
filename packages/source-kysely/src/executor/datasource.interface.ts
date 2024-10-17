export type DataSourceExecutorMeta = {
  query: {
    sql: string;
    params: unknown[];
  };
  timeMs?: number | undefined;
  /**
   * This is defined for insert, update, delete and merge queries and contains
   * the number of rows the query inserted/updated/deleted.
   */
  affectedRows?: number | undefined;
};

export type DatasourceExecutorError = {
  error: string;
  meta?: DataSourceExecutorMeta;
};

export type DatasourceExecutorSuccess<TQuery> = {
  data: TQuery;
  meta: DataSourceExecutorMeta;
};

export type DatasourceExecutorResult<TQuery> =
  | {
      success: true;
      data: TQuery;
      meta: DataSourceExecutorMeta;
    }
  | {
      success: false;
      error: string;
      meta?: DataSourceExecutorMeta;
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoluntaryAny = any;

export interface DatasourceInterface {
  queryRaw: (
    query: VoluntaryAny
  ) => Promise<DatasourceExecutorSuccess<VoluntaryAny>>;
  query: (
    query: VoluntaryAny
  ) => Promise<DatasourceExecutorSuccess<VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

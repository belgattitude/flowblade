import type { IColumnModel } from '../column-model/IColumnModel';

export type DataSourceExecutorMeta = {
  query: {
    sql: string;
    params: unknown[];
    timeMs?: number | undefined;
  };
  columnModel?: IColumnModel | undefined;
  /**
   * This is defined for insert, update, delete and merge queries and contains
   * the number of rows the query inserted/updated/deleted.
   */
  affectedRows?: number | undefined;
};

export type DataSourceExecutorResponse<TQuery> = {
  data: TQuery;
  meta: DataSourceExecutorMeta;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoluntaryAny = any;

export interface IDataSourceExecutor {
  query: (
    query: VoluntaryAny,
    meta?: { columnModel?: IColumnModel }
  ) => Promise<DataSourceExecutorResponse<VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

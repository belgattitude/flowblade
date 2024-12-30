import type { QueryResult } from './query-result';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DatasourceQueryInfo = {
  name?: string;
};

export interface DatasourceInterface {
  getConnection: () => VoluntaryAny;
  queryRaw: (
    query: VoluntaryAny,
    info?: DatasourceQueryInfo
  ) => Promise<QueryResult<VoluntaryAny>>;
  query: (
    query: VoluntaryAny,
    info?: DatasourceQueryInfo
  ) => Promise<QueryResult<VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

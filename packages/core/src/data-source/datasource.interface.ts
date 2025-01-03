import type { QResult } from '../query-result/q-result';
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

  queryExperimental?: (
    query: VoluntaryAny,
    info?: DatasourceQueryInfo
  ) => Promise<QResult<VoluntaryAny, VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

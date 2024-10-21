import type { QueryResult } from './query-result';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DatasourceInterface {
  getConnection: () => VoluntaryAny;
  queryRaw: (query: VoluntaryAny) => Promise<QueryResult<VoluntaryAny>>;
  query: (query: VoluntaryAny) => Promise<QueryResult<VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

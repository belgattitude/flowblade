import type { DatasourceResult } from './datasource-result';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DatasourceInterface {
  getConnection: () => VoluntaryAny;
  queryRaw: (query: VoluntaryAny) => Promise<DatasourceResult<VoluntaryAny>>;
  query: (query: VoluntaryAny) => Promise<DatasourceResult<VoluntaryAny>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

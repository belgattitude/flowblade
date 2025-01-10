import type { QError, QResult } from '../query-result/q-result';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DatasourceQueryInfo = {
  name?: string;
};

export interface DatasourceInterface {
  getConnection: () => VoluntaryAny;

  query: (
    query: VoluntaryAny,
    info?: DatasourceQueryInfo
  ) => Promise<QResult<VoluntaryAny, QError>>;

  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

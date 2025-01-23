import type { AsyncQResult } from '../query-result/types';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DatasourceQueryInfo {
  name?: string;
}

export interface DatasourceInterface {
  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection: () => VoluntaryAny;

  query: (
    query: VoluntaryAny,
    info?: DatasourceQueryInfo
  ) => AsyncQResult<VoluntaryAny, VoluntaryAny>;

  /*
  query: <
    TData extends unknown[] = VoluntaryAny,
    TError extends QError | undefined = VoluntaryAny,
  >(
    query: TData,
    info?: DatasourceQueryInfo
  ) => AsyncQResult<VoluntaryAny, TError>;

*/
  stream: (
    query: VoluntaryAny,
    chunkSize: number
  ) => AsyncIterableIterator<VoluntaryAny>;
}

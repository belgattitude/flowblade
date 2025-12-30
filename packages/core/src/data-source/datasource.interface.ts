import type { QMeta } from '../meta/q-meta';
import type { QResult } from '../query-result/q-result';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface QueryOptions {
  name?: string;
}

export type DatasourceStreamOptions = {
  /**
   * Number of chunks to retrieve while reading the database
   */
  chunkSize?: number;
};

export interface DatasourceInterface {
  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection: () => VoluntaryAny;

  /**
   * Run a query and return a QResult object
   *
   * @example
   * ```typescript
   * const ds = new XXDatasource();
   * const { data, meta, error } = await ds.query('select 1');
   * ```
   */
  query: (
    query: VoluntaryAny,
    options?: QueryOptions
  ) => Promise<QResult<VoluntaryAny, VoluntaryAny>>;

  /**
   * Run the query or throw on error
   *
   * const ds = new XXDatasource();
   * try {
   *  const { data, meta } = await ds.query('select 1');
   * } catch (e) {
   *   //
   * }
   */
  queryOrThrow: (
    query: VoluntaryAny,
    options?: QueryOptions
  ) => Promise<{
    data: VoluntaryAny;
    meta: QMeta;
  }>;

  stream: (
    query: VoluntaryAny,
    options?: DatasourceStreamOptions
  ) => AsyncIterableIterator<VoluntaryAny>;
}

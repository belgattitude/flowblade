import type { SqlTag } from '@flowblade/sql-tag';

import {
  type AsyncQResult,
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type DatasourceQueryInfo,
  type QError,
  QMeta,
  type QResult,
} from '../index';

type VoluntaryAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

type DummyDatasourceParams = {
  connection: VoluntaryAny;
};

/**
 * @internal
 */
export class DummyDatasource implements DatasourceInterface {
  private db: VoluntaryAny;

  constructor(params: DummyDatasourceParams) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.db = params.connection;
  }

  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): VoluntaryAny => this.db;

  /**
   * Run a raw query on the datasource and return a query result (QResult).
   *
   * @example
   * ```typescript
   * import { DuckdbDatasource } from '@flowblade/source-duckdb';
   * import { sql } from '@flowblade/sql-tag';
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * const rawSql = sql<{productId: number}>`
   *   WITH products(productId) AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
   *   SELECT productId FROM products
   *   WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER
   * `;
   *
   * const result = await ds.query(rawSql);
   *
   * // Option 1: the QResult object contains the data, metadata and error
   * //  - data:  the result rows (TData or undefined if error)
   * //  - error: the error (QError or undefined if success)
   * //  - meta:  the metadata (always present)
   *
   * const { data, meta, error } = result;
   *
   * // Option 2: You operate over the result, ie: mapping the data
   *
   * const { data } = result.map((row) => {
   *   return {
   *    id: row.productId,
   *    key: `key-${row.productId}`
   * })
   * ```
   */
  query = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData>,
    info?: DatasourceQueryInfo
  ): AsyncQResult<TData> => {
    const { name } = info ?? {};
    const { text: sql, values: params } = rawQuery;
    const meta = createSqlSpan({ sql, params });
    const start = performance.now();
    try {
      const rows = [] as VoluntaryAny[];
      meta.affectedRows = 0;
      meta.timeMs = performance.now() - start;
      return createQResultSuccess(
        rows as TData,
        new QMeta({ name, spans: meta })
      );
    } catch (err) {
      meta.timeMs = performance.now() - start;
      return createQResultError(
        {
          message: (err as Error).message,
        },
        new QMeta({
          name,
          spans: meta,
        })
      );
    }
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream(
    _query: unknown,
    _chunkSize: number
  ): AsyncIterableIterator<QResult<unknown[], QError>> {
    throw new Error('Not implemented yet');
  }
}

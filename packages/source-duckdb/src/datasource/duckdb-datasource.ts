import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type DatasourceQueryInfo,
  type QError,
  QMeta,
  type QResult,
} from '@flowblade/core';
import type { SqlTag } from '@flowblade/sql-tag';
import type { Database as DuckDbDatabase } from 'duckdb-async';

export type DuckdbDatasourceParams = {
  connection: DuckDbDatabase;
};

export class DuckdbDatasource implements DatasourceInterface {
  private db: DuckDbDatabase;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
  }

  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): DuckDbDatabase => this.db;

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
  ): Promise<QResult<TData, QError>> => {
    const { name } = info ?? {};
    const { sql, values: params } = rawQuery;
    const meta = createSqlSpan({ sql, params });
    const start = performance.now();
    try {
      const rows = await this.db.all(sql, ...params);
      meta.affectedRows = rows.length;
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

import type { DuckDBConnection, DuckDBValue } from '@duckdb/node-api';
import {
  type AsyncQResult,
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type DatasourceQueryInfo,
  type DatasourceStreamOptions,
  type QError,
  QMeta,
  type QResult,
} from '@flowblade/core';
import type { SqlTag } from '@flowblade/sql-tag';

export type DuckdbDatasourceParams = {
  connection: DuckDBConnection;
};

export class DuckdbDatasource implements DatasourceInterface {
  private db: DuckDBConnection;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
  }

  /**
   * Return underlying duckdb connection.
   *
   * Warning: using the underling driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): DuckDBConnection => this.db;

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
   * type ProductRow = {
   *   productId: number
   * };
   *
   * const rawSql = sql<ProductRow>`
   *   WITH products(productId) AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
   *   SELECT productId FROM products
   *   WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER
   * `;
   *
   * const result = await ds.query(rawSql);
   *
   * const { data, meta, error } = result;
   *
   * if (data) {
   *   // Typed as ProductRow[]
   *   console.log(data);
   * }
   * if (error) {
   *   // Typed as QError
   *   console.log(error);
   * }
   *
   * // Optionally: map over the data to transform it
   *
   * const { data: mappedData } = result.map((row) => {
   *   return {
   *    id: row.productId,
   *    key: `key-${row.productId}`
   *   }
   * });
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
      const rows = await this.db.runAndReadAll(sql, params as DuckDBValue[]);
      meta.affectedRows = rows.currentRowCount;
      meta.timeMs = performance.now() - start;
      return createQResultSuccess(
        rows.getRowObjectsJson() as TData,
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
    options?: DatasourceStreamOptions
  ): AsyncIterableIterator<QResult<unknown[], QError>> {
    throw new Error('Not implemented yet');
  }
}

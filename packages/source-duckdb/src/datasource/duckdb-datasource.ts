import type { DuckDBConnection, DuckDBValue } from '@duckdb/node-api';
import {
  type AsyncQResult,
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  type QError,
  QMeta,
  type QMetaSqlSpan,
  type QResult,
  type QueryOptions,
  type QueryStreamOptions,
} from '@flowblade/core';
import type { SqlTag } from '@flowblade/sql-tag';
import type { Logger } from '@logtape/logtape';

import { duckdbDefaultLogtapeLogger } from '../logger/duckdb-default-logtape-logger';

export type DuckdbDatasourceParams = {
  connection: DuckDBConnection;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
};

export class DuckdbDatasource implements DatasourceInterface {
  private db: DuckDBConnection;
  private logger: Logger;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
    this.logger = params.logger ?? duckdbDefaultLogtapeLogger;
  }

  /**
   * Return the underlying duckdb connection.
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
    options?: QueryOptions
  ): AsyncQResult<TData> => {
    const name = options?.name ?? 'anonymous';
    const { text: sql, values: params } = rawQuery;
    const span = createSqlSpan({ sql, params });
    const start = Date.now();
    try {
      this.logger.debug(`Executing query "{queryName}"`, {
        queryName: name,
        sql,
        params,
      });
      const rows = await this.db.runAndReadAll(sql, params as DuckDBValue[]);
      span.affectedRows = rows.currentRowCount;
      span.timeMs = Date.now() - start;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span)
      );

      return createQResultSuccess(
        rows.getRowObjectsJson() as TData,
        new QMeta({ name, spans: span })
      );
    } catch (err) {
      span.timeMs = Math.round(Date.now() - start);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : '<unknown>';
      this.logger.error(
        `Query "{queryName}" failed: ${message}`,
        this.getLogFromSpan(name, span)
      );

      return createQResultError(
        { message },
        new QMeta({
          name,
          spans: span,
        })
      );
    }
  };

  /**
   * Run the query or throw on error
   *
   * @example
   * ```typescript
   * const ds = new DuckDbDatasource();
   * try {
   *  const { data, meta } = await ds.query(sql`select 1`);
   * } catch (e) {
   *   //
   * }
   * ```
   */
  queryOrThrow = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData>,
    options?: QueryOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const { data, meta, error } = await this.query<TData>(rawQuery, options);
    if (error !== undefined) {
      throw new Error(`Query failed: ${error.message}`);
    }
    return {
      data: data!,
      meta,
    };
  };

  // eslint-disable-next-line require-yield,sonarjs/generator-without-yield
  async *stream(
    _query: unknown,
    _options?: QueryStreamOptions
  ): AsyncIterableIterator<QResult<unknown[], QError>> {
    throw new Error('Not implemented yet');
  }

  private getLogFromSpan = (queryName: string, span: QMetaSqlSpan) => {
    return {
      queryName,
      source: 'duckdb',
      type: span.type,
      sql: span.sql,
      params: span.params,
      affectedRows: span.affectedRows,
      timeMs: span.timeMs,
    };
  };
}

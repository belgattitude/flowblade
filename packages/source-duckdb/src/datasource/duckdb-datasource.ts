import type { DuckDBConnection, DuckDBValue } from "@duckdb/node-api";
import {
  type AsyncQResult,
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  QMeta,
  type QMetaSqlSpan,
  type QueryOptions,
  type QueryStreamOptions,
} from "@flowblade/core";
import type { SqlTag } from "@flowblade/sql-tag";
import type { Logger } from "@logtape/logtape";

import { duckdbDefaultLogtapeLogger } from "../logger/duckdb-default-logtape-logger.ts";

export type DuckdbDatasourceParams = {
  connection: DuckDBConnection;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
  /**
   * Whether to include the query params in the logs, set to `false`
   * when they might contain sensitive data.
   *
   * Params are still available in the result meta (QMeta spans).
   *
   * @default true
   */
  logParams?: boolean;
};

type SqlTagInformation = {
  text: string;
  values: unknown[];
};

export class DuckdbDatasource implements DatasourceInterface {
  private readonly db: DuckDBConnection;
  private readonly logger: Logger;
  private readonly logParams: boolean;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
    this.logger = params.logger ?? duckdbDefaultLogtapeLogger;
    this.logParams = params.logParams ?? true;
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
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryOptions
  ): AsyncQResult<TData> => {
    const name = options?.name ?? "anonymous";
    const signal = options?.signal;
    const { text: sql, values: params } = rawQuery;
    const span = createSqlSpan({ sql, params });
    const start = Date.now();
    // Interrupts the query running on the connection when aborted
    const onAbort = () => {
      this.db.interrupt();
    };
    try {
      this.logger.debug(
        'Executing query "{queryName}"',
        this.getLogFromSpan(name, span, "query")
      );
      signal?.throwIfAborted();
      signal?.addEventListener("abort", onAbort, { once: true });
      const rows = await this.db.runAndReadAll(sql, params as DuckDBValue[]);
      // Never return the results of an aborted query as complete
      signal?.throwIfAborted();
      span.affectedRows = rows.currentRowCount;
      span.timeMs = Date.now() - start;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span, "query")
      );

      return createQResultSuccess(
        rows.getRowObjectsJson() as TData,
        new QMeta({ name, spans: span })
      );
    } catch (error) {
      span.timeMs = Date.now() - start;
      let message: string;
      if (error instanceof Error) {
        ({ message } = error);
      } else if (typeof error === "string") {
        message = error;
      } else {
        message = "Unknown error";
      }
      this.logger.error('Query "{queryName}" failed: {errorMessage}', {
        ...this.getLogFromSpan(name, span, "query"),
        errorMessage: message,
      });

      return createQResultError(
        // The interrupt can make DuckDB fail before the abort check,
        // always report an aborted query with the abort reason as cause
        { message, cause: signal?.aborted === true ? signal.reason : error },
        new QMeta({
          name,
          spans: span,
        })
      );
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  };

  /**
   * Run the query or throw on error
   *
   * @example
   * ```typescript
   * const ds = new DuckdbDatasource({ connection: duckdb });
   * try {
   *  const { data, meta } = await ds.queryOrThrow(sql`select 1`);
   * } catch (e) {
   *   //
   * }
   * ```
   */
  queryOrThrow = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TData>(rawQuery, options);
    return {
      data: result.getOrThrow(
        (qErr) =>
          new Error(`Query failed: ${qErr.message}`, { cause: qErr.cause })
      ),
      meta: result.meta,
    };
  };

  /**
   * Stream the rows of a query, chunk by chunk from DuckDB.
   *
   * Rows are converted like `query()` results (JSON compatible values).
   *
   * @example
   * ```typescript
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * for await (const row of ds.stream(sql<{ id: number }>`SELECT range::INTEGER as id FROM range(10)`)) {
   *   console.log(row.id);
   *   if (row.id === 5) {
   *     // Breaking or returning before the stream has ended is supported
   *     break;
   *   }
   * }
   * ```
   *
   * Note: the `chunkSize` option is ignored, DuckDB uses its own chunk size.
   *
   * @yields Each row of the query result as it is streamed.
   * @throws Error with the DuckDB error as cause when the query fails, or the abort reason when aborted.
   */
  async *stream<TData extends unknown[]>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryStreamOptions
  ): AsyncIterableIterator<TData[number]> {
    const name = options?.name ?? "anonymous";
    const signal = options?.signal;
    const { text: sql, values: params } = rawQuery;
    const span = createSqlSpan({ sql, params });
    const start = Date.now();
    // Interrupts the chunk being fetched when aborted
    const onAbort = () => {
      this.db.interrupt();
    };

    this.logger.debug(
      'Streaming query "{queryName}"',
      this.getLogFromSpan(name, span, "stream")
    );

    let rowCount = 0;
    let failed = false;

    try {
      signal?.throwIfAborted();
      signal?.addEventListener("abort", onAbort, { once: true });
      const result = await this.db.stream(sql, params as DuckDBValue[]);
      for await (const rows of result.yieldRowObjectJson()) {
        // Also stops between chunks, when the interrupt didn't hit a fetch
        signal?.throwIfAborted();
        for (const row of rows) {
          rowCount++;
          yield row as TData[number];
        }
      }
      // An interrupted stream can end without error, never report it as complete
      signal?.throwIfAborted();
    } catch (error) {
      failed = true;
      span.timeMs = Date.now() - start;
      span.affectedRows = rowCount;
      const message = error instanceof Error ? error.message : "Unknown error";

      this.logger.error(
        'Streaming query "{queryName}" failed: {errorMessage}',
        {
          ...this.getLogFromSpan(name, span, "stream"),
          errorMessage: message,
        }
      );

      // The interrupt can hit the next chunk fetch before the between-chunks check,
      // always report an aborted stream with the abort reason as cause
      throw new Error(message, {
        cause: error,
      });
    } finally {
      signal?.removeEventListener("abort", onAbort);
      // Runs on completion, on early exit (break / return) and on failure,
      // the failure being already logged as an error above.
      if (!failed) {
        span.timeMs = Date.now() - start;
        span.affectedRows = rowCount;

        this.logger.info(
          'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
          this.getLogFromSpan(name, span, "stream")
        );
      }
    }
  }

  private readonly getLogFromSpan = (
    queryName: string,
    span: QMetaSqlSpan,
    method: "query" | "stream"
  ) => {
    return {
      queryName,
      source: "duckdb",
      method,
      type: span.type,
      sql: span.sql,
      ...(this.logParams ? { params: span.params } : {}),
      affectedRows: span.affectedRows,
      timeMs: span.timeMs,
    };
  };
}

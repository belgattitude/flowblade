import type {
  DuckDBConnection,
  DuckDBResult,
  DuckDBValue,
} from "@duckdb/node-api";
import {
  type AsyncQResult,
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  type DatasourceInterface,
  getOneRowOrThrow,
  QMeta,
  type QMetaSqlSpan,
  type QOneRowErrorFactories,
  type QueryOneOrThrowOptions,
  type QueryOptions,
  type QueryStreamOptions,
  toOneRowQResult,
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
  /**
   * Default errors thrown by `queryOneOrThrow()`
   * when the query doesn't return exactly one row, overridable per query.
   *
   * @example
   * ```typescript
   * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
   *
   * errors: {
   *   onNoResult: ({ error }) =>
   *     new HttpNotFound({ message: "Resource not found", cause: error }),
   *   onTooManyResults: ({ error, rowCount }) =>
   *     new HttpInternalServerError({
   *       message: `Expected one row, got ${rowCount}`,
   *       cause: error,
   *     }),
   * }
   * ```
   */
  errors?: QOneRowErrorFactories;
};

type SqlTagInformation = {
  text: string;
  values: unknown[];
};

export class DuckdbDatasource implements DatasourceInterface {
  private readonly db: DuckDBConnection;
  private readonly logger: Logger;
  private readonly logParams: boolean;
  private readonly errors: QOneRowErrorFactories | undefined;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
    this.logger = params.logger ?? duckdbDefaultLogtapeLogger;
    this.logParams = params.logParams ?? true;
    this.errors = params.errors;
  }

  /**
   * Return the underlying DuckDB connection.
   *
   * Warning: using the underlying driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): DuckDBConnection => this.db;

  /**
   * Run a query and return a QResult object.
   *
   * It never throws: when the query fails, `error` holds a QError (message and
   * the DuckDB error as `cause`) and `data` is undefined. `meta` is always
   * present (sql, params, timing, affected rows...).
   *
   * The result is a discriminated union: checking `error` narrows `data`,
   * even after destructuring.
   *
   * Rows are converted to JSON compatible values (DuckDB `getRowObjectsJson()`,
   * ie: timestamps as strings). When aborted with `signal`, the query is
   * interrupted and the error `cause` holds the abort reason.
   *
   * Use `queryOrThrow()` to get the rows directly and throw on error instead.
   *
   * @example
   * ```typescript
   * import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * const result = await ds.query(
   *   sql<{ productId: number }>`
   *     SELECT range::INTEGER as productId FROM range(1, 100)
   *     WHERE productId BETWEEN ${min}::INTEGER AND ${max}::INTEGER
   *   `,
   *   { name: 'getProducts' }
   * );
   * const { data, error, meta } = result;
   *
   * if (error) {
   *   // error: QError, data: undefined
   *   console.error(error.message, error.cause);
   *   return;
   * }
   * // data is narrowed to { productId: number }[]
   * console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   *
   * // Optionally: map over the rows (a failing mapper returns an error result)
   * const { data: products } = result.map((row) => {
   *   return { id: row.productId, key: `key-${row.productId}` };
   * });
   *
   * // Send the result to a client, the error cause (driver internals) is left out
   * return Response.json(result.toJsonifiable());
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
   * Run a query and return the rows directly, or throw when it fails.
   *
   * The thrown Error message is prefixed with "Query failed: " and its
   * `cause` holds the DuckDB error.
   *
   * Use `query()` to handle errors without try/catch.
   *
   * @example
   * ```typescript
   * const ds = new DuckdbDatasource({ connection: duckdb });
   * try {
   *   const { data, meta } = await ds.queryOrThrow(
   *     sql<{ id: number }>`SELECT range::INTEGER as id FROM range(10)`
   *   );
   *   console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   * } catch (e) {
   *   // ie: "Query failed: Catalog Error: Table with name product does not exist!"
   *   console.error(e);
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
   * Run a query expecting at most one row and return a QResult holding the
   * row, or null when the query returns no row. Like `query()`, it never
   * throws and checking `error` narrows `data`.
   *
   * When the query returns more than one row, the result is an error with
   * `code` "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as `cause`.
   *
   * Check `error` before falling back on `data` (ie: `data ?? fallback`): on
   * error, `data` is undefined and the fallback would hide the failure. For
   * a one-liner, prefer `queryOneOrThrow(query, { defaultValue })`.
   * Query failures have no `code`.
   *
   * More than one row is logged as a warning, no row at debug level (often
   * an expected outcome). Also applies to `queryOneOrThrow()`.
   *
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `LIMIT 2`, `TOP 2` on SQL Server).
   *
   * @example
   * ```typescript
   * const ds = new DuckdbDatasource({ connection: duckdb });
   * const query = sql<{ id: number }>`SELECT id FROM product WHERE id = ${id}`;
   *
   * const { data: product, error } = await ds.queryOne(query);
   * if (error) {
   *   // query failure or more than one row
   *   throw new Error(error.message, { cause: error.cause });
   * }
   * if (product === null) {
   *   // not found, ie: return a 404
   * }
   * ```
   */
  queryOne = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryOptions
  ): AsyncQResult<TData[number] | null> => {
    const result = await this.query<TData>(rawQuery, options);
    if (result.error === undefined) {
      this.logRowCount(result.meta, result.data.length);
    }
    return toOneRowQResult(result);
  };

  /**
   * Run a query expecting exactly one row and return it.
   *
   * Throws a `QErrors.NoResult` when the query returns no row, a `QErrors.TooManyResults`
   * when it returns more than one and, like `queryOrThrow()`, an Error with
   * the driver error as `cause` when the query fails.
   *
   * Use it when the row must exist. The thrown errors can be replaced with
   * `onNoResult` / `onTooManyResults` factories, per query or as datasource
   * defaults (`errors` param). When the row might not exist, set a
   * `defaultValue` (returned rather than throwing when there's no row) or
   * use `queryOne()`.
   *
   * Note: the SQL is never rewritten and checking the row count is free,
   * but all rows are fetched. When the query isn't constrained by a unique
   * key, bound it to 2 rows (ie: `LIMIT 2`, `TOP 2` on SQL Server).
   *
   * @example
   * ```typescript
   * import { HttpNotFound } from "@httpx/exception";
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   * const query = sql<{ id: number }>`SELECT id FROM product WHERE id = ${id}`;
   *
   * // Throws when there isn't exactly one row
   * const { data: product, meta } = await ds.queryOneOrThrow(query);
   *
   * // Or throw your own error (also settable as datasource default)
   * const { data: product } = await ds.queryOneOrThrow(query, {
   *   onNoResult: ({ error }) =>
   *     new HttpNotFound({ message: `Product ${id} not found`, cause: error }),
   * });
   *
   * // Or return a default value when there's no row
   * const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
   *   defaultValue: defaultSettings,
   * });
   * ```
   */
  queryOneOrThrow = async <TData extends unknown[], TDefault = never>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryOneOrThrowOptions<TDefault>
  ): Promise<{
    data: TData[number] | TDefault;
    meta: QMeta;
  }> => {
    const result = await this.queryOne<TData>(rawQuery, options);
    return {
      data: getOneRowOrThrow(result, options, this.errors),
      meta: result.meta,
    };
  };

  /**
   * Stream the rows of a query, one row at a time, rather than loading
   * the whole result in memory.
   *
   * Rows are read chunk by chunk from DuckDB and converted like `query()`
   * results (JSON compatible values). Breaking or returning before the stream
   * has ended is supported and releases the underlying resources.
   *
   * Unlike `query()`, errors are thrown while iterating.
   *
   * Note: the `chunkSize` option is ignored, DuckDB uses its own chunk size.
   *
   * @example
   * ```typescript
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * const stream = ds.stream(
   *   sql<{ id: number }>`SELECT range::INTEGER as id FROM range(10)`
   * );
   * for await (const row of stream) {
   *   console.log(row.id);
   *   if (row.id === 5) {
   *     break;
   *   }
   * }
   * ```
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
    let result: DuckDBResult | undefined;

    try {
      signal?.throwIfAborted();
      signal?.addEventListener("abort", onAbort, { once: true });
      result = await this.db.stream(sql, params as DuckDBValue[]);
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
      // oxlint-disable-next-line preserve-caught-error -- the abort reason is the intended cause
      throw new Error(message, {
        cause: signal?.aborted === true ? signal.reason : error,
      });
    } finally {
      signal?.removeEventListener("abort", onAbort);
      // Since DuckDB 2.0, a stream not read to the end (break / return / failure)
      // blocks the connection until closed. closeSync() is not available before 1.5.6-r.2.
      if (result !== undefined && "closeSync" in result) {
        result.closeSync();
      }
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

  /**
   * Log the `queryOne()` row count when it isn't one: more than one row as
   * a warning (missing condition or broken data integrity), no row at debug
   * level as it's often an expected outcome (ie: not found).
   */
  private readonly logRowCount = (meta: QMeta, rowCount: number): void => {
    const [span] = meta.getSpansByType("sql");
    if (rowCount === 1 || span === undefined) {
      return;
    }
    const properties = {
      ...this.getLogFromSpan(meta.name ?? "anonymous", span, "queryOne"),
      rowCount,
    };
    if (rowCount > 1) {
      this.logger.warn(
        'Query "{queryName}" expected one row, received {rowCount}',
        properties
      );
    } else {
      this.logger.debug('Query "{queryName}" returned no row', properties);
    }
  };

  private readonly getLogFromSpan = (
    queryName: string,
    span: QMetaSqlSpan,
    method: "query" | "queryOne" | "stream"
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

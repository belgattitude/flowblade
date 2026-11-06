import type {
  DuckDBConnection,
  DuckDBResult,
  DuckDBValue,
} from "@duckdb/node-api";
import {
  type AsyncQResult,
  type DatasourceInterface,
  QErrors,
  QMeta,
  type QMetaSqlSpan,
  type DatasourceDefaultOptions,
  type QueryOneOrThrowOptions,
  type QueryOptions,
  type QueryOrThrowOptions,
  type QueryStreamOptions,
  type TransactionalDatasourceInterface,
  type TransactionOptions,
  type TransactionOrThrowOptions,
  type TransactionScopeInterface,
} from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  getDataOrThrow,
  getOneRowOrThrow,
  runTransaction,
  toOneRowQResult,
} from "@flowblade/core/datasource";
import type { SqlTag } from "@flowblade/sql-tag";
import type { Logger } from "@logtape/logtape";

import {
  type ConnectionHold,
  type DuckdbTransactionContext,
  getConnectionLock,
  getContextHold,
  type ReleaseLock,
  runWithHold,
} from "../internal/connection-lock.ts";
import { isDuckdbTransactionConflict } from "../internal/is-duckdb-transaction-conflict.ts";
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
   * Default options, keyed by method name: only the named method uses them,
   * and the options passed per query win. `transaction` is used by
   * `transaction()` and `transactionOrThrow()`, the `retry` fields passed per
   * transaction win.
   *
   * @example
   * ```typescript
   * import { createExponentialBackoff } from "@flowblade/core";
   * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
   *
   * defaultOptions: {
   *   // Used by queryOrThrow() only, query() never throws
   *   queryOrThrow: {
   *     onError: ({ error }) => new HttpInternalServerError({ cause: error }),
   *   },
   *   // Used by queryOneOrThrow() only, queryOne() never throws
   *   queryOneOrThrow: {
   *     onError: ({ error }) => new HttpInternalServerError({ cause: error }),
   *     onNoResult: ({ error }) =>
   *       new HttpNotFound({ message: "Resource not found", cause: error }),
   *     onTooManyResults: ({ error, rowCount }) =>
   *       new HttpInternalServerError({
   *         message: `Expected one row, got ${rowCount}`,
   *         cause: error,
   *       }),
   *   },
   *   transaction: {
   *     // Retry the conflicts with another connection, with an exponential
   *     // backoff: 0-100ms, 0-200ms then 0-400ms
   *     retry: {
   *       maxRetries: 3,
   *       delayMs: createExponentialBackoff({
   *         initialDelayMs: 100,
   *         jitter: "full",
   *       }),
   *     },
   *   },
   * }
   * ```
   */
  defaultOptions?: DatasourceDefaultOptions;
};

type SqlTagInformation = {
  text: string;
  values: unknown[];
};

/**
 * Options of the DuckDB `transaction()`: DuckDB has no isolation levels
 * (always snapshot isolation), and a failed query always aborts the
 * transaction (no `onFailedQuery: "commit"`).
 */
export type DuckdbTransactionOptions = Omit<
  TransactionOptions,
  "isolationLevel" | "onFailedQuery"
>;

/**
 * Options of the DuckDB `transactionOrThrow()`.
 */
export type DuckdbTransactionOrThrowOptions = Omit<
  TransactionOrThrowOptions,
  "isolationLevel" | "onFailedQuery"
>;

/**
 * Datasource received by the `transaction()` / `transactionOrThrow()`
 * callbacks: a `DuckdbDatasource` running its queries in the transaction,
 * plus `rollback()`. Nested transactions aren't supported.
 */
export type DuckdbTransactionDatasource = Omit<
  DuckdbDatasource,
  "transaction" | "transactionOrThrow"
> &
  TransactionScopeInterface;

export class DuckdbDatasource
  implements
    DatasourceInterface,
    TransactionalDatasourceInterface<DuckdbTransactionDatasource>
{
  private readonly db: DuckDBConnection;
  private readonly logger: Logger;
  private readonly logParams: boolean;
  private readonly defaultOptions: DatasourceDefaultOptions;
  /**
   * Transaction datasource only: reports its queries to `runTransaction()`
   * (spans, failed queries prevent the commit).
   */
  protected transactionContext: DuckdbTransactionContext | undefined;

  constructor(params: DuckdbDatasourceParams) {
    this.db = params.connection;
    this.logger = params.logger ?? duckdbDefaultLogtapeLogger;
    this.logParams = params.logParams ?? true;
    this.defaultOptions = params.defaultOptions ?? {};
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
   * It never throws: when the query fails, `error` holds a QError (message,
   * `code` "QUERY_FAILED" and the DuckDB error as `cause`, or `code`
   * "ABORTED" and the abort reason as `cause`) and `data` is undefined.
   * `meta` is always present (sql, params, timing, affected rows...).
   *
   * The result is a discriminated union: checking `error` narrows `data`,
   * even after destructuring.
   *
   * Rows are converted to JSON compatible values (DuckDB `getRowObjectsJson()`,
   * ie: timestamps as strings). When aborted with `signal`, the query is
   * interrupted and the error (`code` "ABORTED") holds the abort reason as `cause`.
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
    const result = this.runQuery<TData>(rawQuery, options);
    // in a transaction: it waits for the query, even when not awaited
    return await (this.getTransactionContext()?.trackQuery(result) ?? result);
  };

  /**
   * Run a query, see `query()`.
   */
  private readonly runQuery = async <TData extends unknown[]>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryOptions
  ): AsyncQResult<TData> => {
    const name = options?.name ?? "anonymous";
    // the transaction datasource, or a datasource used in a transaction callback
    const txContext = this.getTransactionContext();
    const signal = this.getSignal(options?.signal, txContext);
    const { text: sql, values: params } = rawQuery;
    const span = createSqlSpan({ sql, params });
    // reset once the lock is acquired: the span times the query only
    let start = Date.now();
    // Interrupts the query running on the connection when aborted
    const onAbort = () => {
      this.db.interrupt();
    };
    let releaseLock: ReleaseLock | undefined;
    try {
      this.logger.debug(
        'Executing query "{queryName}"',
        this.getLogFromSpan(name, span, "query")
      );
      signal?.throwIfAborted();
      txContext?.assertActive();
      // Waits for a running transaction, before listening to the abort:
      // the interrupt would hit the transaction query
      const lockWaitStart = Date.now();
      const waitsForLock = this.isLockBusy();
      releaseLock = await this.acquireSharedLock(signal);
      if (waitsForLock) {
        const lockWaitMs = Date.now() - lockWaitStart;
        start = Date.now();
        this.logger.debug(
          'Query "{queryName}" waited {lockWaitMs}ms for a transaction',
          { ...this.getLogFromSpan(name, span, "query"), lockWaitMs }
        );
      }
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
      txContext?.addSpan(span);

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
      txContext?.addSpan(span);
      txContext?.onQueryFailed(error);

      // The interrupt can make DuckDB fail before the abort check,
      // always report an aborted query with the abort reason as cause
      const aborted = signal?.aborted === true;
      return createQResultError(
        {
          message,
          code: aborted ? "ABORTED" : "QUERY_FAILED",
          cause: aborted ? signal.reason : error,
        },
        new QMeta({
          name,
          spans: span,
        })
      );
    } finally {
      signal?.removeEventListener("abort", onAbort);
      releaseLock?.();
    }
  };

  /**
   * Run a query and return the rows directly, or throw when it fails.
   *
   * Throws a `QErrors.QueryFailed` (message prefixed with "Query failed: ",
   * the DuckDB error as `cause`), or a `QErrors.Aborted` when aborted with
   * `signal` (the abort reason as `cause`). To throw your own error, pass
   * an `onError` factory, per query or for the whole datasource with the
   * `defaultOptions.queryOrThrow` param.
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
    options?: QueryOrThrowOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TData>(rawQuery, options);
    return {
      data: getDataOrThrow(result, {
        onError: options?.onError ?? this.defaultOptions.queryOrThrow?.onError,
      }),
      meta: result.meta,
    };
  };

  /**
   * Run a query expecting at most one row and return a QResult holding the
   * row, or null when the query returns no row. Like `query()`, it never
   * throws and checking `error` narrows `data`.
   *
   * When the query returns more than one row, the result is an error with
   * `code` "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as `cause`
   * (query failures: "QUERY_FAILED" or "ABORTED").
   *
   * Check `error` before falling back on `data` (ie: `data ?? fallback`): on
   * error, `data` is undefined and the fallback would hide the failure. For
   * a one-liner, prefer `queryOneOrThrow(query, { defaultValue })`.
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
   * Throws when the query doesn't return exactly one row:
   * - no row: a `QErrors.NoResult`, unless a `defaultValue` is set (returned
   *   instead),
   * - more than one row: a `QErrors.TooManyResults` (with `rowCount`).
   *
   * Like `queryOrThrow()`, a query failure throws a `QErrors.QueryFailed`
   * (or a `QErrors.Aborted`).
   *
   * The errors can be replaced with `onNoResult` / `onTooManyResults` /
   * `onError` (query failures) factories, per query or for the whole
   * datasource with the `defaultOptions.queryOneOrThrow` param (per query
   * options win).
   * When the row might not exist, set a `defaultValue` or use `queryOne()`.
   *
   * Replaces the deprecated `(await ds.queryOne(query)).getOrThrow()`: to
   * get null when there's no row, set `{ defaultValue: null }`.
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
   * const { data: row, meta } = await ds.queryOneOrThrow(query);
   *
   * // Or throw your own error (for the whole datasource: `defaultOptions.queryOneOrThrow`)
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
      data: getOneRowOrThrow(
        result,
        options,
        this.defaultOptions.queryOneOrThrow
      ),
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
   * Unlike `query()`, errors are thrown while iterating: a `QErrors.QueryFailed`,
   * or a `QErrors.Aborted` when aborted with `signal`.
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
   * @throws QErrors.QueryFailed with the DuckDB error as cause when the query fails, QErrors.Aborted with the abort reason as cause when aborted.
   */
  async *stream<TData extends unknown[]>(
    rawQuery: SqlTag<TData> | SqlTagInformation,
    options?: QueryStreamOptions
  ): AsyncIterableIterator<TData[number]> {
    const name = options?.name ?? "anonymous";
    // the transaction datasource, or a datasource used in a transaction callback
    const txContext = this.getTransactionContext();
    const signal = this.getSignal(options?.signal, txContext);
    const { text: sql, values: params } = rawQuery;
    const span = createSqlSpan({ sql, params });
    // reset once the lock is acquired: the span times the query only
    let start = Date.now();
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
    let releaseLock: ReleaseLock | undefined;

    try {
      signal?.throwIfAborted();
      txContext?.assertActive();
      // Held until the stream ends: a transaction waits for it
      const lockWaitStart = Date.now();
      const waitsForLock = this.isLockBusy();
      releaseLock = await this.acquireSharedLock(signal);
      if (waitsForLock) {
        const lockWaitMs = Date.now() - lockWaitStart;
        start = Date.now();
        this.logger.debug(
          'Streaming query "{queryName}" waited {lockWaitMs}ms for a transaction',
          { ...this.getLogFromSpan(name, span, "stream"), lockWaitMs }
        );
      }
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
      txContext?.onQueryFailed(error);

      // The interrupt can hit the next chunk fetch before the between-chunks check,
      // always report an aborted stream with the abort reason as cause
      if (signal?.aborted === true) {
        // oxlint-disable-next-line preserve-caught-error -- the abort reason is the intended cause
        throw new QErrors.Aborted(message, { cause: signal.reason });
      }
      throw new QErrors.QueryFailed(message, { cause: error });
    } finally {
      signal?.removeEventListener("abort", onAbort);
      // Since DuckDB 2.0, a stream not read to the end (break / return / failure)
      // blocks the connection until closed.
      try {
        result?.closeSync();
      } finally {
        releaseLock?.();
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
      txContext?.addSpan(span);
    }
  }

  /**
   * Run a callback in a transaction and return a QResult holding the value
   * returned by the callback.
   *
   * The callback receives a datasource running its queries in the transaction
   * (`query()`, `queryOrThrow()`, `queryOne()`, `queryOneOrThrow()` and
   * `stream()`). The transaction is committed when the callback returns, and
   * rolled back when it throws or calls `tx.rollback()`.
   *
   * It never throws, `error.code` is:
   * - "ROLLED_BACK": the callback threw (ie: a failed `tx.queryOrThrow()`) or
   *   called `tx.rollback()`, the thrown error is the `cause`,
   * - "TRANSACTION_FAILED": a query failed in the transaction (handled by
   *   the callback or not, it's then rolled back), or the transaction
   *   couldn't begin, commit or roll back, the driver error is the `cause`,
   * - "TRANSACTION_CONFLICT": the transaction conflicts with a concurrent one
   *   (of another connection), it can be retried (see `retry`),
   * - "ABORTED": aborted with `signal`, the abort reason is the `cause`.
   *
   * `meta` holds a "transaction" span followed by the spans of the queries
   * run in the transaction.
   *
   * The transaction holds the connection: the queries and streams of the
   * datasources using the same connection (and `withConnectionLock()`
   * callbacks) wait for it to end, and it waits for the running ones to end
   * before beginning. In the callback (its async context), they run in the
   * transaction rather than waiting forever: prefer `tx` though.
   *
   * Notes:
   * - A failed query is never committed, even when handled by the callback
   *   (ie: `tx.query()` never throws): DuckDB aborts the transaction on any
   *   error and silently rolls back on commit. Prefer the throwing methods
   *   (ie: `tx.queryOrThrow()`) in the callback.
   * - Don't start a transaction while iterating over a stream of the same
   *   connection, it would wait for the stream forever.
   * - Await the queries: a query not awaited still ends before the commit
   *   (the transaction waits for it), but a query started after the callback
   *   returned fails. Fully consume (or break) the `tx.stream()` iterators.
   * - DuckDB has no isolation levels (snapshot isolation) and doesn't support
   *   nested transactions.
   *
   * @example
   * ```typescript
   * import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * const { data: count, error, meta } = await ds.transaction(
   *   async (tx) => {
   *     await tx.queryOrThrow(sql`DELETE FROM product WHERE expired`);
   *     await tx.queryOrThrow(sql`INSERT INTO product SELECT * FROM staging`);
   *     const { data: row } = await tx.queryOneOrThrow(
   *       sql<{ count: number }>`SELECT count(*)::INTEGER as count FROM product`
   *     );
   *     if (row.count === 0) {
   *       // Rolls back, error.code: "ROLLED_BACK"
   *       tx.rollback('empty product table');
   *     }
   *     return row.count;
   *   },
   *   { name: 'refreshProducts' }
   * );
   *
   * if (error) {
   *   // "ROLLED_BACK", "TRANSACTION_FAILED", "TRANSACTION_CONFLICT" or "ABORTED"
   *   console.error(error.code, error.message, error.cause);
   * }
   * ```
   */
  transaction = async <TData>(
    fn: (tx: DuckdbTransactionDatasource) => Promise<TData>,
    options?: DuckdbTransactionOptions
  ): AsyncQResult<TData> => {
    const accessMode = options?.accessMode;

    const result = await runTransaction<
      {
        tx: DuckdbTransactionDatasourceImpl;
        hold: ConnectionHold;
        releaseLock: ReleaseLock;
      },
      TData
    >({
      // DuckDB aborts the transaction on any failed query: a commit would
      // silently roll back
      options:
        options === undefined
          ? undefined
          : { ...options, onFailedQuery: "rollback" },
      defaultRetry: this.defaultOptions.transaction?.retry,
      isConflictError: isDuckdbTransactionConflict,
      log: { logger: this.logger, source: "duckdb" },
      begin: async (context) => {
        const lock = getConnectionLock(this.db);
        const contextHold = getContextHold(lock);
        if (
          this.transactionContext !== undefined ||
          contextHold?.transaction !== undefined
        ) {
          throw new Error(
            "Nested transactions are not supported, run the queries with the transaction datasource"
          );
        }
        if (contextHold !== undefined) {
          // would wait for the lock held by this async context forever
          throw new Error(
            "Can't begin a transaction while the connection is held by this async context (ie: in a withConnectionLock() callback)"
          );
        }
        // not in the types, but might be passed through TransactionalDatasourceInterface
        if (
          options !== undefined &&
          "isolationLevel" in options &&
          options.isolationLevel !== undefined
        ) {
          throw new Error(
            "DuckDB doesn't support isolation levels (snapshot isolation)"
          );
        }
        const releaseLock = await lock.acquireExclusive(options?.signal);
        try {
          await this.db.run(
            accessMode === "read only"
              ? "BEGIN TRANSACTION READ ONLY"
              : "BEGIN TRANSACTION"
          );
        } catch (error) {
          releaseLock();
          throw error;
        }
        // oxlint-disable-next-line no-use-before-define -- subclass, defined after its parent
        const tx = new DuckdbTransactionDatasourceImpl(
          {
            connection: this.db,
            logger: this.logger,
            logParams: this.logParams,
            defaultOptions: this.defaultOptions,
          },
          { ...context, signal: options?.signal }
        );
        // The callback holds the connection: in its async context, the
        // queries of the datasources on this connection run in the transaction
        const hold: ConnectionHold = {
          lock,
          released: false,
          transaction: { ...context, signal: options?.signal },
        };
        return { tx, hold, releaseLock };
      },
      fn: ({ tx, hold }) => runWithHold(hold, () => fn(tx)),
      commit: async ({ hold, releaseLock }) => {
        // On failure, runTransaction() rolls back and releases the lock
        await this.db.run("COMMIT");
        hold.released = true;
        releaseLock();
      },
      rollback: async ({ hold, releaseLock }) => {
        try {
          await this.db.run("ROLLBACK");
        } finally {
          hold.released = true;
          releaseLock();
        }
      },
    });

    return result;
  };

  /**
   * Run a callback in a transaction and return the value returned by the
   * callback, or throw when the transaction is rolled back or fails.
   *
   * Like `transaction()`, the callback receives a datasource running its
   * queries in the transaction, committed when the callback returns and
   * rolled back when it throws or calls `tx.rollback()`.
   *
   * Throws the error thrown by the callback as is (ie: a `QErrors.QueryFailed`
   * from `tx.queryOrThrow()`, a `QErrors.RolledBack` from `tx.rollback()`),
   * a `QErrors.TransactionConflict` when it conflicts with a concurrent one,
   * a `QErrors.TransactionFailed` when a query failed in the transaction
   * (handled by the callback) or the transaction couldn't begin, commit
   * or roll back, or a `QErrors.Aborted` when aborted with `signal`. To throw
   * your own error, pass an `onError` factory.
   *
   * @example
   * ```typescript
   * import { DuckdbDatasource, sql } from '@flowblade/source-duckdb';
   *
   * const ds = new DuckdbDatasource({ connection: duckdb });
   *
   * await ds.transactionOrThrow(
   *   async (tx) => {
   *     await tx.queryOrThrow(sql`DELETE FROM product WHERE expired`);
   *     await tx.queryOrThrow(sql`INSERT INTO product SELECT * FROM staging`);
   *   },
   *   { name: 'refreshProducts' }
   * );
   * ```
   */
  transactionOrThrow = async <TData>(
    fn: (tx: DuckdbTransactionDatasource) => Promise<TData>,
    options?: DuckdbTransactionOrThrowOptions
  ): Promise<{ data: TData; meta: QMeta }> => {
    const result = await this.transaction(fn, options);
    return {
      data: getDataOrThrow(result, { onError: options?.onError }),
      meta: result.meta,
    };
  };

  /**
   * Combine the query signal with the transaction one, if any.
   */
  private readonly getSignal = (
    signal: AbortSignal | undefined,
    txContext: DuckdbTransactionContext | undefined
  ): AbortSignal | undefined => {
    const transactionSignal = txContext?.signal;
    if (transactionSignal === undefined || signal === undefined) {
      return signal ?? transactionSignal;
    }
    return AbortSignal.any([signal, transactionSignal]);
  };

  /**
   * The transaction the queries run in: of the transaction datasource, or of
   * the transaction callback the query is run in (the connection is shared).
   */
  private readonly getTransactionContext = ():
    | DuckdbTransactionContext
    | undefined =>
    this.transactionContext ??
    getContextHold(getConnectionLock(this.db))?.transaction;

  /**
   * Whether a query must wait for the lock (ie: for a running transaction).
   */
  private readonly isLockBusy = (): boolean => {
    if (this.transactionContext !== undefined) {
      return false;
    }
    const lock = getConnectionLock(this.db);
    return getContextHold(lock) === undefined && lock.isSharedBusy();
  };

  /**
   * Wait for a running transaction on the connection, unless the connection
   * is already held: by the transaction datasource, or by the current async
   * context (a transaction or `withConnectionLock()` callback).
   */
  private readonly acquireSharedLock = async (
    signal: AbortSignal | undefined
  ): Promise<ReleaseLock | undefined> => {
    if (this.transactionContext !== undefined) {
      return undefined;
    }
    const lock = getConnectionLock(this.db);
    return getContextHold(lock) === undefined
      ? await lock.acquireShared(signal)
      : undefined;
  };

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

/**
 * Datasource received by the transaction callbacks, see `DuckdbTransactionDatasource`.
 */
class DuckdbTransactionDatasourceImpl
  extends DuckdbDatasource
  implements TransactionScopeInterface
{
  constructor(
    params: DuckdbDatasourceParams,
    context: DuckdbTransactionContext
  ) {
    super(params);
    this.transactionContext = context;
  }

  rollback = (reason?: string): never => {
    throw new QErrors.RolledBack(reason);
  };
}

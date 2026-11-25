import {
  type AsyncQResult,
  type DatasourceDefaultOptions,
  type DatasourceInterface,
  QErrors,
  QMeta,
  type QMetaSqlSpan,
  type QueryOneOrThrowOptions,
  type QueryOneQError,
  type QueryOptions,
  type QueryOrThrowOptions,
  type QueryQError,
  type QueryStreamOptions,
  type SavepointOptions,
  type SavepointOrThrowOptions,
  type TransactionalDatasourceInterface,
  type TransactionOptions,
  type TransactionOrThrowOptions,
  type TransactionQError,
  type TransactionSavepointInterface,
  type TransactionScopeInterface,
} from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  createSqlSpan,
  getDataOrThrow,
  getOneRowOrThrow,
  runSavepoint,
  runTransaction,
  toOneRowQResult,
  type TransactionBeginContext,
} from "@flowblade/core/datasource";
import type { Logger } from "@logtape/logtape";
import type { Knex } from "knex";

import { getKnexErrorMessage } from "../internal/get-knex-error-message.ts";
import { isKnexTransactionConflict } from "../internal/is-knex-transaction-conflict.ts";
import {
  type NormalizedKnexResponse,
  normalizeKnexBuilderResponse,
  normalizeKnexRawResponse,
} from "../internal/normalize-knex-response.ts";
import { knexDefaultLogtapeLogger } from "../logger/knex-default-logtape-logger.ts";

type Params = {
  /**
   * The Knex instance (or transaction) to run the queries on.
   */
  connection: Knex;
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
   * Whether a driver error is a conflict with a concurrent transaction
   * (serialization failure, deadlock): reported as a "TRANSACTION_CONFLICT"
   * error by `transaction()`, retried with its `retry` option.
   *
   * Defaults to recognize the Postgres ("40001", "40P01"), SQL Server (1205,
   * 3960) and MySQL (1213) errors.
   *
   * @example
   * ```typescript
   * // ie: also retry SQLite busy errors
   * isTransactionConflict: (error) =>
   *   (error as { code?: unknown }).code === "SQLITE_BUSY",
   * ```
   */
  isTransactionConflict?: (error: unknown) => boolean;
  /**
   * Default options, keyed by method name, the options passed per query win
   * (`queryOrThrow`, `queryOneOrThrow` error factories and the `transaction`
   * retry policy).
   *
   * @example
   * ```typescript
   * import { createExponentialBackoff } from "@flowblade/core";
   *
   * defaultOptions: {
   *   transaction: {
   *     retry: {
   *       maxRetries: 3,
   *       delayMs: createExponentialBackoff({ initialDelayMs: 100 }),
   *     },
   *   },
   * }
   * ```
   */
  defaultOptions?: DatasourceDefaultOptions;
};

/**
 * Knex query builder or raw query.
 */
export type KnexQuery = Knex.QueryBuilder | Knex.Raw;

type CompiledKnexQuery = {
  sql: string;
  bindings: readonly unknown[];
  method: string;
};

type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Rows returned by a Knex query: the resolved array, the single row of
 * `first()` (wrapped in an array), or nothing for a write returning an
 * affected rows count. A raw query (untyped) gives `unknown[]`, pass `TData`
 * to type it.
 */
export type KnexInferRows<T extends KnexQuery> =
  IsAny<Awaited<T>> extends true
    ? unknown[]
    : Awaited<T> extends number
      ? []
      : Awaited<T> extends readonly unknown[]
        ? Awaited<T>
        : NonNullable<Awaited<T>> extends object
          ? [NonNullable<Awaited<T>>]
          : unknown[];

type KnexTransactionContext = TransactionBeginContext & {
  signal: AbortSignal | undefined;
  /** Running queries of the transaction (or of its savepoint) */
  pending: Set<PromiseLike<unknown>>;
};

/**
 * Datasource received by the `transaction()` / `transactionOrThrow()`
 * callbacks: a `KnexDatasource` running its queries in the transaction,
 * plus `rollback()` and the savepoints (`savepoint()` /
 * `savepointOrThrow()`). Nested transactions aren't supported, use a
 * savepoint.
 */
export type KnexTransactionDatasource = Omit<
  KnexDatasource,
  "transaction" | "transactionOrThrow"
> &
  TransactionScopeInterface &
  TransactionSavepointInterface<KnexTransactionDatasource>;

const isTransaction = (connection: Knex): connection is Knex.Transaction =>
  (connection as unknown as { isTransaction?: boolean }).isTransaction === true;

/**
 * Reject when the signal aborts. Knex has no cancellation: the query keeps
 * running on the database and its connection is released once it settles.
 *
 * In a transaction, the running query is added to `pending` until it settles:
 * the transaction waits for it before committing or rolling back (a driver
 * like tedious doesn't queue a request sent on a busy connection).
 */
const raceAbort = async <T>(
  query: PromiseLike<T>,
  signal: AbortSignal | undefined,
  pending: Set<PromiseLike<unknown>> | undefined
): Promise<T> => {
  if (signal === undefined && pending === undefined) {
    return await query;
  }
  signal?.throwIfAborted();
  // A Knex builder is a lazy thenable running its query on each `then()`:
  // subscribe only once (a second one would run the query twice).
  const running = Promise.resolve(query);
  // in a transaction: its end waits for the query, even when ignored
  pending?.add(running);
  void running
    .finally(() => {
      pending?.delete(running);
    })
    .catch(() => undefined);
  if (signal === undefined) {
    return await running;
  }
  const { promise: aborted, reject } = Promise.withResolvers<never>();
  const onAbort = () => {
    reject(signal.reason);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([running, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
    // a query ignored after an abort must not end up as an unhandled rejection
    void running.catch(() => undefined);
  }
};

export class KnexDatasource
  implements
    DatasourceInterface,
    TransactionalDatasourceInterface<KnexTransactionDatasource>
{
  private readonly db: Knex;
  private readonly logger: Logger;
  private readonly logParams: boolean;
  private readonly defaultOptions: DatasourceDefaultOptions;
  private readonly isTransactionConflict: (error: unknown) => boolean;
  /**
   * Transaction datasource only: the transaction signal (combined with the
   * queries one), and the reporting of its queries to `runTransaction()`
   * (spans, failed queries prevent the commit).
   */
  protected transactionContext: KnexTransactionContext | undefined;

  /**
   * Return the Knex query builder (the Knex instance, or the transaction one
   * in a transaction callback).
   *
   * @example
   * ```typescript
   * import { KnexDatasource } from '@flowblade/source-knex';
   *
   * const ds = new KnexDatasource({ connection: db });
   *
   * const query = ds.queryBuilder('brand as b')
   *   .select('b.id', 'b.name')
   *   .where('b.created_at', '<', new Date())
   *   .orderBy('b.name', 'desc');
   * ```
   */
  public get queryBuilder(): Knex {
    return this.db;
  }

  constructor(params: Params) {
    this.db = params.connection;
    this.logger = params.logger ?? knexDefaultLogtapeLogger;
    this.logParams = params.logParams ?? true;
    this.isTransactionConflict =
      params.isTransactionConflict ?? isKnexTransactionConflict;
    this.defaultOptions = params.defaultOptions ?? {};
  }

  /**
   * Return the underlying Knex instance (or transaction).
   *
   * Warning: using the underlying driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): Knex => this.db;

  /**
   * Run a query and return a QResult object.
   *
   * It never throws: when the query fails, `error` holds a QError (message,
   * `code` "QUERY_FAILED" and the driver error as `cause`, or `code`
   * "ABORTED" and the abort reason as `cause`) and `data` is undefined.
   * `meta` is always present (sql, params, timing, affected rows...).
   *
   * Accepts a Knex query builder or a `knex.raw()` query. The rows are
   * normalized whatever the dialect: the selected (or returned) rows, a
   * single row of `first()` wrapped in an array, and `affectedRows` in the
   * meta for the writes returning a count.
   *
   * Knex can't cancel a query: when `signal` aborts, the result is an
   * "ABORTED" error but the query keeps running on the database.
   *
   * Use `queryOrThrow()` to get the rows directly and throw on error instead.
   *
   * @example
   * ```typescript
   * import { KnexDatasource } from '@flowblade/source-knex';
   *
   * const ds = new KnexDatasource({ connection: db });
   * const query = ds.queryBuilder('brand as b')
   *   .select('b.id', 'b.name')
   *   .orderBy('b.name', 'desc');
   *
   * const { data, error, meta } = await ds.query(query, { name: 'getBrands' });
   *
   * if (error) {
   *   console.error(error.message, error.cause);
   *   return;
   * }
   * console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   * ```
   */
  query = async <
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions
  ): AsyncQResult<TData, QueryQError> => {
    const result = this.runQuery<TQuery, TData>(query, options);
    // in a transaction: it waits for the query, even when not awaited
    return await (this.transactionContext?.trackQuery(result) ?? result);
  };

  private readonly runQuery = async <
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions
  ): AsyncQResult<TData, QueryQError> => {
    const name = options?.name ?? "anonymous";
    const signal = this.getSignal(options?.signal);
    const start = Date.now();
    let span: QMetaSqlSpan | undefined;

    try {
      const { sql, bindings, method } = query.toSQL() as CompiledKnexQuery;
      span = createSqlSpan({ sql, params: [...bindings] });

      this.logger.debug(
        'Executing query "{queryName}"',
        this.getLogFromSpan(name, span, "query")
      );
      this.transactionContext?.assertActive();

      const response: unknown = await raceAbort(
        this.bind(query),
        signal,
        this.transactionContext?.pending
      );
      const { rows, affectedRows }: NormalizedKnexResponse =
        method === "raw"
          ? normalizeKnexRawResponse(response, this.getDialect())
          : normalizeKnexBuilderResponse(response);
      span.timeMs = Date.now() - start;
      span.affectedRows = affectedRows;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span, "query")
      );
      this.transactionContext?.addSpan(span);

      return createQResultSuccess(
        rows as TData,
        new QMeta({ name, spans: span })
      );
    } catch (error) {
      if (span !== undefined) {
        span.timeMs = Date.now() - start;
      }

      const message = getKnexErrorMessage(error);

      this.logger.error('Query "{queryName}" failed: {errorMessage}', {
        ...(span === undefined
          ? { queryName: name, source: "knex", method: "query" }
          : this.getLogFromSpan(name, span, "query")),
        errorMessage: message,
      });
      if (span !== undefined) {
        this.transactionContext?.addSpan(span);
      }
      this.transactionContext?.onQueryFailed(error);

      // Report an aborted query with the abort reason as cause
      const aborted = signal?.aborted === true;
      const cause: unknown = aborted ? signal?.reason : error;
      return createQResultError(
        {
          message,
          code: aborted ? "ABORTED" : "QUERY_FAILED",
          cause,
        },
        new QMeta({
          name,
          ...(span === undefined ? {} : { spans: span }),
        })
      );
    }
  };

  /**
   * Run a query and return the rows and meta, it throws when the query fails.
   *
   * @example
   * ```typescript
   * const { data, meta } = await ds.queryOrThrow(
   *   ds.queryBuilder('brand').select('id', 'name')
   * );
   * ```
   */
  queryOrThrow = async <
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions & QueryOrThrowOptions
  ): Promise<{
    data: TData;
    meta: QMeta;
  }> => {
    const result = await this.query<TQuery, TData>(query, options);
    return {
      data: getDataOrThrow(result, {
        onError: options?.onError ?? this.defaultOptions.queryOrThrow?.onError,
      }),
      meta: result.meta,
    };
  };

  /**
   * Run a query expected to return at most one row, the result `data` is the
   * row or `null`. It never throws, a query returning more than one row is
   * reported as a "TOO_MANY_RESULTS" error.
   *
   * @example
   * ```typescript
   * const { data, error } = await ds.queryOne(
   *   ds.queryBuilder('brand').select('id', 'name').where('id', 1)
   * );
   * ```
   */
  queryOne = async <
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
  >(
    query: TQuery,
    options?: QueryOptions
  ): AsyncQResult<TData[number] | null, QueryOneQError> => {
    const result = await this.query<TQuery, TData>(query, options);
    if (result.error === undefined) {
      this.logRowCount(result.meta, result.data.length);
    }
    return toOneRowQResult(result);
  };

  /**
   * Run a query expected to return exactly one row and return it, it throws
   * when the query fails, returns no row or more than one row.
   *
   * @example
   * ```typescript
   * const { data } = await ds.queryOneOrThrow(
   *   ds.queryBuilder('brand').select('id', 'name').where('id', 1)
   * );
   * ```
   */
  queryOneOrThrow = async <
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
    TDefault = never,
  >(
    query: TQuery,
    options?: QueryOptions & QueryOneOrThrowOptions<TDefault>
  ): Promise<{
    data: TData[number] | TDefault;
    meta: QMeta;
  }> => {
    const result = await this.queryOne<TQuery, TData>(query, options);
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
   * Stream the rows of a query (Knex `.stream()`), without loading them all
   * in memory. The connection is released when the stream is consumed, when
   * the loop is left early or when `signal` aborts.
   *
   * Streaming needs driver support (ie: `pg-query-stream` for Postgres).
   * `chunkSize` is passed to the stream as its `highWaterMark` (rows
   * buffered). Errors are thrown.
   *
   * @yields The rows of the query, one at a time.
   *
   * @example
   * ```typescript
   * for await (const row of ds.stream(ds.queryBuilder('brand').select('*'))) {
   *   console.log(row);
   * }
   * ```
   */
  async *stream<
    TQuery extends KnexQuery,
    TData extends unknown[] = KnexInferRows<TQuery>,
  >(
    query: TQuery,
    options?: QueryStreamOptions
  ): AsyncIterableIterator<TData[0]> {
    const { chunkSize } = options ?? {};
    const signal = this.getSignal(options?.signal);
    const name = options?.name ?? "anonymous";

    const { sql, bindings } = query.toSQL() as CompiledKnexQuery;
    const span = createSqlSpan({ sql, params: [...bindings] });
    const start = Date.now();

    this.logger.debug(
      'Streaming query "{queryName}"',
      this.getLogFromSpan(name, span, "stream")
    );

    let rowCount = 0;
    let failed = false;
    let readable: ReturnType<Knex.QueryBuilder["stream"]> | undefined;
    // Knex releases the connection of a streamed query on the 'close' event
    // (emitted after the `closed` flag is set): wait for it
    let closed: Promise<void> | undefined;

    try {
      this.transactionContext?.assertActive();
      signal?.throwIfAborted();
      readable = this.bind(query).stream(
        chunkSize === undefined ? {} : { highWaterMark: chunkSize }
      );
      const stream = readable;
      // oxlint-disable-next-line promise/avoid-new -- no promise api for the stream 'close' event
      closed = new Promise<void>((resolve) => {
        stream.once("close", () => {
          resolve();
        });
      });
      const onAbort = () => {
        readable?.destroy(signal?.reason as Error);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        for await (const row of readable) {
          rowCount++;
          yield row as TData[0];
        }
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }
    } catch (error) {
      failed = true;
      span.timeMs = Date.now() - start;
      span.affectedRows = rowCount;

      const message = getKnexErrorMessage(error);

      this.logger.error(
        'Streaming query "{queryName}" failed: {errorMessage}',
        {
          ...this.getLogFromSpan(name, span, "stream"),
          errorMessage: message,
        }
      );
      this.transactionContext?.addSpan(span);
      this.transactionContext?.onQueryFailed(error);
      throw new Error(`Streaming query "${name}" failed: ${message}`, {
        cause: error,
      });
    } finally {
      // leaving the loop early or failing: release the connection
      if (readable !== undefined) {
        if (!readable.destroyed) {
          readable.destroy();
        }
        await closed;
      }
      if (!failed) {
        span.timeMs = Date.now() - start;
        span.affectedRows = rowCount;
        this.logger.info(
          'Streaming query "{queryName}" executed in {timeMs}ms, streamed {affectedRows} row(s)',
          this.getLogFromSpan(name, span, "stream")
        );
        this.transactionContext?.addSpan(span);
      }
    }
  }

  /**
   * Run `fn` in a transaction: committed when it resolves, rolled back when
   * it throws, when `tx.rollback()` is called or when a query of the
   * transaction fails (see `onFailedQuery`). It never throws, errors are
   * reported in the result (`TRANSACTION_FAILED`, `TRANSACTION_CONFLICT`,
   * `ROLLED_BACK`, `ABORTED`...), conflicts can be retried with `retry`.
   *
   * Run the queries with the `tx` datasource of the callback, and await them.
   *
   * @example
   * ```typescript
   * const { data, error } = await ds.transaction(async (tx) => {
   *   await tx.queryOrThrow(
   *     tx.queryBuilder('brand').insert({ name: 'Acme' })
   *   );
   *   return 'done';
   * }, { isolationLevel: 'serializable' });
   * ```
   */
  transaction = async <TData>(
    fn: (tx: KnexTransactionDatasource) => Promise<TData>,
    options?: TransactionOptions
  ): AsyncQResult<TData, TransactionQError> => {
    const { isolationLevel, accessMode } = options ?? {};

    return await runTransaction<
      {
        trx: Knex.Transaction;
        tx: KnexTransactionDatasourceImpl;
      },
      TData
    >({
      options,
      defaultRetry: this.defaultOptions.transaction?.retry,
      getErrorMessage: getKnexErrorMessage,
      isConflictError: this.isTransactionConflict,
      log: { logger: this.logger, source: "knex" },
      begin: async (context) => {
        if (isTransaction(this.db)) {
          throw new Error(
            "Nested transactions are not supported, run the queries with the transaction datasource"
          );
        }
        const config: Knex.TransactionConfig = {
          ...(isolationLevel === undefined ? {} : { isolationLevel }),
          ...(accessMode === undefined
            ? {}
            : { readOnly: accessMode === "read only" }),
        };
        const trx = await this.db.transaction(config);
        // oxlint-disable-next-line no-use-before-define -- subclass, defined after its parent
        const tx = new KnexTransactionDatasourceImpl(
          {
            connection: trx,
            logger: this.logger,
            logParams: this.logParams,
            defaultOptions: this.defaultOptions,
          },
          { ...context, signal: options?.signal, pending: new Set() }
        );
        return { trx, tx };
      },
      fn: ({ tx }) => fn(tx),
      commit: async ({ trx, tx }) => {
        await tx.settlePending();
        await trx.commit();
      },
      rollback: async ({ trx, tx }) => {
        await tx.settlePending();
        if (!trx.isCompleted()) {
          await trx.rollback();
        }
      },
    });
  };

  /**
   * Same as `transaction()` but returns the callback result and meta, and
   * throws when the transaction fails.
   */
  transactionOrThrow = async <TData>(
    fn: (tx: KnexTransactionDatasource) => Promise<TData>,
    options?: TransactionOrThrowOptions
  ): Promise<{ data: TData; meta: QMeta }> => {
    const result = await this.transaction(fn, options);
    return {
      data: getDataOrThrow(result, { onError: options?.onError }),
      meta: result.meta,
    };
  };

  /**
   * In a transaction, run the query on the transaction connection, even when
   * it was built with the parent Knex instance.
   */
  private readonly bind = <TQuery extends KnexQuery>(query: TQuery): TQuery =>
    isTransaction(this.db) ? (query.transacting(this.db) as TQuery) : query;

  private readonly getDialect = (): string | undefined =>
    (this.db.client as { dialect?: string }).dialect;

  private readonly getSignal = (
    signal: AbortSignal | undefined
  ): AbortSignal | undefined => {
    const transactionSignal = this.transactionContext?.signal;
    if (transactionSignal === undefined || signal === undefined) {
      return signal ?? transactionSignal;
    }
    return AbortSignal.any([signal, transactionSignal]);
  };

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
      source: "knex",
      method,
      type: span.type,
      sql: span.sql,
      ...(this.logParams ? { params: span.params } : {}),
      affectedRows: span.affectedRows,
      timeMs: span.timeMs,
    };
  };
}

let savepointCounter = 0;

class KnexTransactionDatasourceImpl
  extends KnexDatasource
  implements
    TransactionScopeInterface,
    TransactionSavepointInterface<KnexTransactionDatasource>
{
  readonly #params: Params;

  constructor(params: Params, context: KnexTransactionContext) {
    super(params);
    this.#params = params;
    this.transactionContext = context;
  }

  rollback = (reason?: string): never => {
    throw new QErrors.RolledBack(reason);
  };

  /**
   * Wait for the queries still running (ie: ignored after an abort).
   *
   * @internal
   */
  settlePending = async (): Promise<void> => {
    const pending = this.transactionContext?.pending;
    if (pending !== undefined) {
      await Promise.allSettled(pending);
    }
  };

  /**
   * Run `fn` in a savepoint of the transaction: released when it resolves,
   * rolled back to when it throws (the transaction continues).
   */
  savepoint = async <TData>(
    fn: (tx: KnexTransactionDatasource) => Promise<TData>,
    options?: SavepointOptions
  ): AsyncQResult<TData> => {
    const context = this.transactionContext;
    if (context === undefined) {
      throw new Error("A savepoint requires a transaction");
    }
    savepointCounter++;
    const name = `flowblade_sp_${savepointCounter}`;
    const parent = this.getConnection() as Knex.Transaction;
    return await runSavepoint<
      { sp: Knex.Transaction; tx: KnexTransactionDatasourceImpl },
      TData
    >({
      context,
      name,
      options,
      getErrorMessage: getKnexErrorMessage,
      begin: async (spContext) => {
        // a nested Knex transaction is a savepoint
        const sp = await parent.transaction();
        const tx = new KnexTransactionDatasourceImpl(
          { ...this.#params, connection: sp },
          { ...spContext, signal: context.signal, pending: context.pending }
        );
        return { sp, tx };
      },
      rollback: async ({ sp, tx }) => {
        await tx.settlePending();
        if (!sp.isCompleted()) {
          await sp.rollback();
        }
      },
      release: async ({ sp, tx }) => {
        await tx.settlePending();
        if (!sp.isCompleted()) {
          await sp.commit();
        }
      },
      fn: ({ tx }) => fn(tx),
    });
  };

  savepointOrThrow = async <TData>(
    fn: (tx: KnexTransactionDatasource) => Promise<TData>,
    options?: SavepointOrThrowOptions
  ): Promise<{ data: TData; meta: QMeta }> => {
    const result = await this.savepoint(fn, options);
    return {
      data: getDataOrThrow(result, { onError: options?.onError }),
      meta: result.meta,
    };
  };
}

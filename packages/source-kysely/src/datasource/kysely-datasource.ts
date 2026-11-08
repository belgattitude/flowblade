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
  type QueryOneQError,
  type QueryQError,
  type QueryStreamOptions,
  type TransactionalDatasourceInterface,
  type TransactionOptions,
  type TransactionQError,
  type TransactionOrThrowOptions,
  type TransactionScopeInterface,
  type SavepointOptions,
  type SavepointOrThrowOptions,
  type TransactionSavepointInterface,
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
import type {
  Compilable,
  ControlledTransaction,
  InferResult,
  InflightQueryAbortStrategy,
  Kysely,
  RawBuilder,
} from "kysely";

import { getKyselyErrorMessage } from "../internal/get-kysely-error-message.ts";
import { isKyselyStreamable } from "../internal/is-kysely-streamable.ts";
import { isKyselyTransactionAlreadyRolledBack } from "../internal/is-kysely-transaction-already-rolled-back.ts";
import { isKyselyTransactionConflict } from "../internal/is-kysely-transaction-conflict.ts";
import { parseBigIntToSafeInt } from "../internal/parse-bigint-to-safeint.ts";
import { kyselyDefaultLogtapeLogger } from "../logger/kysely-default-logtape-logger.ts";

type Params<TDatabase> = {
  connection: Kysely<TDatabase>;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
  /**
   * @deprecated Use `defaultOptions.query.inflightQueryAbortStrategy`
   * instead, the `defaultOptions` value wins when both are set.
   */
  inflightQueryAbortStrategy?: InflightQueryAbortStrategy;
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
   * Defaults to recognize the Postgres (pg, postgres.js: "40001", "40P01"),
   * SQL Server (tedious: 1205, 3960) and MySQL (mysql2: 1213) errors.
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
   * Default options, keyed by method name, the options passed per query win:
   * - `query`: options of `query()`, also used by the methods running it
   *   (`queryOrThrow()`, `queryOne()` and `queryOneOrThrow()`),
   * - `queryOrThrow` / `queryOneOrThrow`: error factories, used by the named
   *   method only,
   * - `transaction`: options of `transaction()` and `transactionOrThrow()`
   *   (ie: the `retry` policy), the `retry` fields passed per transaction win.
   *
   * @example
   * ```typescript
   * import { createExponentialBackoff } from "@flowblade/core";
   * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
   *
   * defaultOptions: {
   *   query: {
   *     // Cancel aborted queries on the database (Kysely default: 'ignore query')
   *     inflightQueryAbortStrategy: "cancel query",
   *   },
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
   *     // Retry the conflicts (serialization failure, deadlock), with an
   *     // exponential backoff: 0-100ms, 0-200ms then 0-400ms
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
  defaultOptions?: KyselyDatasourceDefaultOptions;
};

export type KyselyQueryOptions = QueryOptions & {
  /**
   * What happens to an in-flight query when its `signal` is aborted.
   *
   * - `'ignore query'` (Kysely default): stop waiting for the results, the query
   *   keeps running on the database and the connection is released once it settles.
   * - `'cancel query'`: cancel the query on the database (ie: mssql, postgres, mysql).
   *   Falls back to `'ignore query'` with a warning when the dialect can't.
   * - `'kill session'`: kill the database session running the query.
   *
   * Defaults to the datasource `defaultOptions.query.inflightQueryAbortStrategy`.
   */
  inflightQueryAbortStrategy?: InflightQueryAbortStrategy;
};

/**
 * Datasource default options of the `KyselyDatasource`: the core defaults
 * plus the `query()` options.
 */
export type KyselyDatasourceDefaultOptions = DatasourceDefaultOptions & {
  /**
   * Default options of `query()`, also used by the methods running it
   * (`queryOrThrow()`, `queryOne()` and `queryOneOrThrow()`).
   */
  query?: Pick<KyselyQueryOptions, "inflightQueryAbortStrategy">;
};

type KyselyQueryOrRawQuery<T = unknown> = Compilable<T> | RawBuilder<T>;
type KyselyInferQueryOrRawQuery<T extends KyselyQueryOrRawQuery> =
  T extends RawBuilder<unknown>
    ? Awaited<ReturnType<T["execute"]>>["rows"]
    : T extends Compilable
      ? InferResult<T>
      : never;

/**
 * Datasource received by the `transaction()` / `transactionOrThrow()`
 * callbacks: a `KyselyDatasource` running its queries in the transaction,
 * plus `rollback()` and the savepoints (`savepoint()` /
 * `savepointOrThrow()`). Nested transactions aren't supported, use a
 * savepoint.
 */
export type KyselyTransactionDatasource<TDatabase> = Omit<
  KyselyDatasource<TDatabase>,
  "transaction" | "transactionOrThrow"
> &
  TransactionScopeInterface &
  TransactionSavepointInterface<KyselyTransactionDatasource<TDatabase>>;

export class KyselyDatasource<TDatabase>
  implements
    DatasourceInterface,
    TransactionalDatasourceInterface<KyselyTransactionDatasource<TDatabase>>
{
  private readonly db: Kysely<TDatabase>;
  private readonly logger: Logger;
  private readonly logParams: boolean;
  private readonly defaultOptions: KyselyDatasourceDefaultOptions;
  private readonly isTransactionConflict: (error: unknown) => boolean;
  /**
   * Transaction datasource only: the transaction signal (combined with the
   * queries one), and the reporting of its queries to `runTransaction()`
   * (spans, failed queries prevent the commit).
   */
  protected transactionContext:
    | (TransactionBeginContext & { signal: AbortSignal | undefined })
    | undefined;

  /**
   * Return a new Kysely expression builder.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
   *
   * // Kysely Expression builder (query, update, delete, merge...)
   * const eb = ds.queryBuilder;
   *
   * const query = eb.selectFrom('brand as b')
   *                 .select(['b.id', 'b.name']);
   *
   * ```
   */
  public get queryBuilder(): Pick<
    Kysely<TDatabase>,
    | "mergeInto"
    | "selectFrom"
    | "selectNoFrom"
    | "deleteFrom"
    | "updateTable"
    | "insertInto"
    | "replaceInto"
    | "with"
    | "withRecursive"
    | "withSchema"
    | "withPlugin"
    | "withoutPlugins"
    | "withTables"
  > {
    return this.db;
  }

  constructor(params: Params<TDatabase>) {
    this.db = params.connection;
    this.logger = params.logger ?? kyselyDefaultLogtapeLogger;
    this.logParams = params.logParams ?? true;
    this.isTransactionConflict =
      params.isTransactionConflict ?? isKyselyTransactionConflict;
    // oxlint-disable-next-line typescript/no-deprecated -- still supported as an alias
    const { defaultOptions = {}, inflightQueryAbortStrategy } = params;
    this.defaultOptions = {
      ...defaultOptions,
      query: {
        // deprecated param, kept as an alias
        inflightQueryAbortStrategy,
        ...defaultOptions.query,
      },
    };
  }

  /**
   * Return the underlying Kysely instance.
   *
   * Warning: using the underlying driver connection isn't recommended
   *          and not covered by api stability. Use at your own risks.
   */
  getConnection = (): Kysely<TDatabase> => this.db;

  /**
   * Run a query and return a QResult object.
   *
   * It never throws: when the query fails, `error` holds a QError (message,
   * `code` "QUERY_FAILED" and the driver error as `cause`, or `code`
   * "ABORTED" and the abort reason as `cause`) and `data` is undefined.
   * `meta` is always present (sql, params, timing, affected rows...).
   *
   * The result is a discriminated union: checking `error` narrows `data`,
   * even after destructuring.
   *
   * Accepts a Kysely query builder or a raw `sql` query from kysely. When
   * aborted with `signal`, the `inflightQueryAbortStrategy` option (default:
   * `defaultOptions.query.inflightQueryAbortStrategy`) decides what happens
   * to the running query.
   *
   * Use `queryOrThrow()` to get the rows directly and throw on error instead.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom('brand as b')
   *   .select(['b.id', 'b.name'])
   *   .where('b.created_at', '<', new Date())
   *   .orderBy('b.name', 'desc');
   *
   * const result = await ds.query(query, { name: 'getBrands' });
   * const { data, error, meta } = result;
   *
   * if (error) {
   *   // error: QError, data: undefined
   *   console.error(error.message, error.cause);
   *   return;
   * }
   * // data is narrowed to the selected rows (ie: { id: number; name: string }[])
   * console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   *
   * // Optionally: map over the rows (a failing mapper returns an error result)
   * const { data: brands } = result.map((row) => {
   *   return { ...row, key: `key-${row.id}` };
   * });
   *
   * // Send the result to a client, the error cause (driver internals) is left out
   * return Response.json(result.toJsonifiable());
   * ```
   */
  query = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions
  ): AsyncQResult<TData, QueryQError> => {
    const result = this.runQuery<TQuery, TData>(query, options);
    // in a transaction: it waits for the query, even when not awaited
    return await (this.transactionContext?.trackQuery(result) ?? result);
  };

  /**
   * Run a query, see `query()`.
   */
  private readonly runQuery = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions
  ): AsyncQResult<TData, QueryQError> => {
    const name = options?.name ?? "anonymous";
    const signal = this.getSignal(options?.signal);
    const start = Date.now();
    let span: QMetaSqlSpan | undefined;

    try {
      const compiled = query.compile(this.db);
      span = createSqlSpan({
        sql: compiled.sql,
        params: compiled.parameters,
      });

      this.logger.debug(
        'Executing query "{queryName}"',
        this.getLogFromSpan(name, span, "query")
      );
      this.transactionContext?.assertActive();

      const r = await this.db.executeQuery(compiled, {
        signal,
        inflightQueryAbortStrategy:
          options?.inflightQueryAbortStrategy ??
          this.defaultOptions.query?.inflightQueryAbortStrategy,
      });
      const { numAffectedRows, ...result } = r;
      span.timeMs = Date.now() - start;
      span.affectedRows = parseBigIntToSafeInt(numAffectedRows) ?? 0;

      this.logger.info(
        'Query "{queryName}" executed in {timeMs}ms, affected {affectedRows} row(s)',
        this.getLogFromSpan(name, span, "query")
      );
      this.transactionContext?.addSpan(span);

      return createQResultSuccess(
        result.rows as TData,
        new QMeta({ name, spans: span })
      );
    } catch (error) {
      if (span !== undefined) {
        span.timeMs = Date.now() - start;
      }

      const message = getKyselyErrorMessage(error);

      this.logger.error('Query "{queryName}" failed: {errorMessage}', {
        ...(span === undefined
          ? {
              queryName: name,
              source: "kysely",
              method: "query",
            }
          : this.getLogFromSpan(name, span, "query")),
        errorMessage: message,
      });
      if (span !== undefined) {
        this.transactionContext?.addSpan(span);
      }
      this.transactionContext?.onQueryFailed(error);

      // Report an aborted query with the abort reason as cause, whatever
      // the dialect threw
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
   * Run a query and return the rows directly, or throw when it fails.
   *
   * Throws a `QErrors.QueryFailed` (message prefixed with "Query failed: ",
   * the driver error as `cause`), or a `QErrors.Aborted` when aborted with
   * `signal` (the abort reason as `cause`). To throw your own error, pass
   * an `onError` factory, per query or for the whole datasource with the
   * `defaultOptions.queryOrThrow` param.
   *
   * Use `query()` to handle errors without try/catch.
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder.selectFrom('brand as b').select(['b.id', 'b.name']);
   * try {
   *   const { data, meta } = await ds.queryOrThrow(query);
   *   console.log(`${data.length} rows in ${meta.getTotalTimeMs()}ms`);
   * } catch (e) {
   *   // ie: "Query failed: Invalid object name 'brand'."
   *   console.error(e);
   * }
   * ```
   */
  queryOrThrow = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions & QueryOrThrowOptions
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
   * key, bound it to 2 rows (ie: `.limit(2)`, `.top(2)` on SQL Server).
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom("brand as b")
   *   .select(["b.id", "b.name"])
   *   .where("b.id", "=", id);
   *
   * const { data: brand, error } = await ds.queryOne(query);
   * if (error) {
   *   // query failure or more than one row
   *   throw new Error(error.message, { cause: error.cause });
   * }
   * if (brand === null) {
   *   // not found, ie: return a 404
   * }
   * ```
   */
  queryOne = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: KyselyQueryOptions
  ): AsyncQResult<TData[number] | null, QueryOneQError> => {
    const result = await this.query<TQuery, TData>(query, options);
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
   * key, bound it to 2 rows (ie: `.limit(2)`, `.top(2)` on SQL Server).
   *
   * @example
   * ```typescript
   * import { HttpNotFound } from "@httpx/exception";
   *
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom("brand as b")
   *   .select(["b.id", "b.name"])
   *   .where("b.id", "=", id);
   *
   * // Throws when there isn't exactly one row
   * const { data: row, meta } = await ds.queryOneOrThrow(query);
   *
   * // Or throw your own error (for the whole datasource: `defaultOptions.queryOneOrThrow`)
   * const { data: brand } = await ds.queryOneOrThrow(query, {
   *   onNoResult: ({ error }) =>
   *     new HttpNotFound({ message: `Brand ${id} not found`, cause: error }),
   * });
   *
   * // Or return a default value when there's no row
   * const { data: settings } = await ds.queryOneOrThrow(settingsQuery, {
   *   defaultValue: defaultSettings,
   * });
   * ```
   */
  queryOneOrThrow = async <
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
    TDefault = never,
  >(
    query: TQuery,
    options?: KyselyQueryOptions & QueryOneOrThrowOptions<TDefault>
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
   * Stream the rows of a query, one row at a time, rather than loading
   * the whole result in memory.
   *
   * Rows are read from the database in chunks of `chunkSize` rows (support
   * depends on the dialect). Breaking or returning before the stream has
   * ended is supported and releases the database connection.
   *
   * Unlike `query()`, errors are thrown while iterating: a `QErrors.QueryFailed`,
   * or a `QErrors.Aborted` when aborted with `signal`. Only query builders
   * can be streamed, raw `sql` queries throw.
   *
   * @example
   * ```typescript
   * const ds = new KyselyDatasource({ connection: db });
   * const query = ds.queryBuilder
   *   .selectFrom('brand as b')
   *   .select(['b.id', 'b.name'])
   *   .orderBy('b.name', 'desc');
   *
   * const stream = ds.stream(query, { chunkSize: 1000 });
   * for await (const brand of stream) {
   *   console.log(brand.name);
   *   if (brand.name === 'Something') {
   *     break;
   *   }
   * }
   * ```
   *
   * @yields Each row of the query result as it is streamed.
   * @throws QErrors.QueryFailed with the driver error as cause when the query fails, QErrors.Aborted with the abort reason as cause when aborted.
   */
  async *stream<
    TQuery extends KyselyQueryOrRawQuery,
    TData extends unknown[] = KyselyInferQueryOrRawQuery<TQuery>,
  >(
    query: TQuery,
    options?: QueryStreamOptions
  ): AsyncIterableIterator<TData[0]> {
    if (!isKyselyStreamable(query)) {
      throw new Error("Query is not streamable, be sure to check usage");
    }
    const { chunkSize } = options ?? {};
    const signal = this.getSignal(options?.signal);
    const name = options?.name ?? "anonymous";

    const compiled = query.compile(this.db);

    const span = createSqlSpan({
      sql: compiled.sql,
      params: compiled.parameters,
    });

    const start = Date.now();

    this.logger.debug(
      'Streaming query "{queryName}"',
      this.getLogFromSpan(name, span, "stream")
    );

    let rowCount = 0;
    let failed = false;

    try {
      this.transactionContext?.assertActive();
      // Run on this datasource connection (ie: the transaction one), not
      // the executor of the builder (ie: built with the parent queryBuilder)
      const results = this.db
        .getExecutor()
        .stream(compiled, chunkSize ?? 100, { signal });
      for await (const { rows } of results) {
        for (const row of rows as TData[0][]) {
          rowCount++;
          yield row;
        }
      }
    } catch (error) {
      failed = true;
      span.timeMs = Date.now() - start;
      span.affectedRows = rowCount;

      const message = getKyselyErrorMessage(error);

      this.logger.error(
        'Streaming query "{queryName}" failed: {errorMessage}',
        {
          ...this.getLogFromSpan(name, span, "stream"),
          errorMessage: message,
        }
      );
      this.transactionContext?.onQueryFailed(error);

      if (signal?.aborted === true) {
        // oxlint-disable-next-line preserve-caught-error -- the abort reason is the intended cause
        throw new QErrors.Aborted(message, { cause: signal.reason });
      }
      throw new QErrors.QueryFailed(message, { cause: error });
    } finally {
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
      this.transactionContext?.addSpan(span);
    }
  }

  /**
   * Log the `queryOne()` row count when it isn't one: more than one row as
   * a warning (missing condition or broken data integrity), no row at debug
   * level as it's often an expected outcome (ie: not found).
   */
  /**
   * Run a callback in a transaction and return a QResult holding the value
   * returned by the callback.
   *
   * The callback receives a datasource running its queries in the transaction
   * (`query()`, `queryOrThrow()`, `queryOne()`, `queryOneOrThrow()`, `stream()`
   * and `queryBuilder`). The transaction is committed when the callback returns,
   * and rolled back when it throws or calls `tx.rollback()`.
   *
   * It never throws, `error.code` is:
   * - "ROLLED_BACK": the callback threw (ie: a failed `tx.queryOrThrow()`) or
   *   called `tx.rollback()`, the thrown error is the `cause`,
   * - "TRANSACTION_FAILED": a query failed in the transaction (handled by
   *   the callback or not, it's then rolled back unless `onFailedQuery` is
   *   "commit"), or the transaction couldn't begin, commit or roll back, the
   *   driver error is the `cause`,
   * - "TRANSACTION_CONFLICT": the transaction conflicts with a concurrent one
   *   (ie: serialization failure, deadlock), it can be retried (see `retry`),
   * - "ABORTED": aborted with `signal`, the abort reason is the `cause`.
   *
   * `meta` holds a "transaction" span followed by the spans of the queries
   * run in the transaction.
   *
   * Notes:
   * - By default (`onFailedQuery: "rollback"`), a failed query is never
   *   committed, even when handled by the callback (ie: `tx.query()` never
   *   throws): Postgres aborts the transaction on error and silently rolls
   *   back on commit. Prefer the throwing methods (ie: `tx.queryOrThrow()`)
   *   in the callback, or a savepoint (`tx.savepoint()`). With
   *   `onFailedQuery: "commit"` (ie: SQL Server, MySQL), the transaction is
   *   committed anyway, except after a conflict.
   * - Await the queries: a query not awaited still ends before the commit
   *   (the transaction waits for it), but a query started after the callback
   *   returned fails. Fully consume (or break) the `tx.stream()` iterators.
   * - Run the queries with `tx`: the datasource queries run outside of the
   *   transaction, and wait forever for its connection on single connection
   *   dialects (ie: SQLite). A query built with `ds.queryBuilder` and run
   *   with `tx` runs in the transaction.
   * - Nested transactions aren't supported.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
   *
   * const { data: orderId, error, meta } = await ds.transaction(
   *   async (tx) => {
   *     const { data: order } = await tx.queryOneOrThrow(
   *       tx.queryBuilder
   *         .insertInto('order')
   *         .values({ customer_id: customerId })
   *         .returning(['id'])
   *     );
   *     const { data: stock } = await tx.queryOneOrThrow(getStock);
   *     if (stock.quantity < quantity) {
   *       // Rolls back, error.code: "ROLLED_BACK"
   *       tx.rollback('out of stock');
   *     }
   *     await tx.queryOrThrow(insertOrderLines(order.id));
   *     return order.id;
   *   },
   *   {
   *     name: 'createOrder',
   *     isolationLevel: 'serializable',
   *     // serialization failures are expected, run it again on conflict
   *     retry: { maxRetries: 3 },
   *   }
   * );
   *
   * if (error) {
   *   // "ROLLED_BACK", "TRANSACTION_FAILED", "TRANSACTION_CONFLICT" or "ABORTED"
   *   console.error(error.code, error.message, error.cause);
   *   return;
   * }
   * console.log(`Order ${orderId} created in ${meta.getTotalTimeMs()}ms`);
   * ```
   */
  transaction = async <TData>(
    fn: (tx: KyselyTransactionDatasource<TDatabase>) => Promise<TData>,
    options?: TransactionOptions
  ): AsyncQResult<TData, TransactionQError> => {
    const { isolationLevel, accessMode } = options ?? {};

    const result = await runTransaction<
      {
        trx: ControlledTransaction<TDatabase>;
        tx: KyselyTransactionDatasourceImpl<TDatabase>;
      },
      TData
    >({
      options,
      defaultRetry: this.defaultOptions.transaction?.retry,
      getErrorMessage: getKyselyErrorMessage,
      isConflictError: this.isTransactionConflict,
      log: { logger: this.logger, source: "kysely" },
      begin: async (context) => {
        if (this.db.isTransaction) {
          throw new Error(
            "Nested transactions are not supported, run the queries with the transaction datasource"
          );
        }
        let builder = this.db.startTransaction();
        if (isolationLevel !== undefined) {
          builder = builder.setIsolationLevel(isolationLevel);
        }
        if (accessMode !== undefined) {
          builder = builder.setAccessMode(accessMode);
        }
        const trx = await builder.execute();
        // oxlint-disable-next-line no-use-before-define -- subclass, defined after its parent
        const tx = new KyselyTransactionDatasourceImpl<TDatabase>(
          {
            connection: trx,
            logger: this.logger,
            logParams: this.logParams,
            defaultOptions: this.defaultOptions,
          },
          { ...context, signal: options?.signal }
        );
        return { trx, tx };
      },
      fn: ({ tx }) => fn(tx),
      commit: async ({ trx }) => {
        await trx.commit().execute();
      },
      rollback: async ({ trx }) => {
        try {
          await trx.rollback().execute();
        } catch (error) {
          if (!isKyselyTransactionAlreadyRolledBack(error)) {
            throw error;
          }
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
   * a `QErrors.TransactionConflict` when it conflicts with a concurrent one
   * (see `retry`), a `QErrors.TransactionFailed` when a query failed in the
   * transaction (handled by the callback, unless `onFailedQuery` is "commit")
   * or the transaction couldn't begin, commit or roll back, or a
   * `QErrors.Aborted` when aborted with `signal`. To throw your own error,
   * pass an `onError` factory.
   *
   * @example
   * ```typescript
   * import { KyselyDatasource } from '@flowblade/source-kysely';
   *
   * const ds = new KyselyDatasource({ connection: db });
   *
   * const { data: orderId } = await ds.transactionOrThrow(
   *   async (tx) => {
   *     const { data: order } = await tx.queryOneOrThrow(insertOrder);
   *     await tx.queryOrThrow(insertOrderLines(order.id));
   *     return order.id;
   *   },
   *   { name: 'createOrder' }
   * );
   * ```
   */
  transactionOrThrow = async <TData>(
    fn: (tx: KyselyTransactionDatasource<TDatabase>) => Promise<TData>,
    options?: TransactionOrThrowOptions
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
      source: "kysely",
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
 * Datasource received by the transaction callbacks, see `KyselyTransactionDatasource`.
 */
/**
 * SQL names of the savepoints, unique in the process.
 */
let savepointCounter = 0;

/**
 * Thrown by kysely when the dialect driver has no `releaseSavepoint()`.
 */
const releaseSavepointNotSupportedMessage =
  "The `releaseSavepoint` method is not supported by this driver";

class KyselyTransactionDatasourceImpl<TDatabase>
  extends KyselyDatasource<TDatabase>
  implements
    TransactionScopeInterface,
    TransactionSavepointInterface<KyselyTransactionDatasource<TDatabase>>
{
  readonly #params: Params<TDatabase>;

  constructor(
    params: Params<TDatabase>,
    context: TransactionBeginContext & { signal: AbortSignal | undefined }
  ) {
    super(params);
    this.#params = params;
    this.transactionContext = context;
  }

  rollback = (reason?: string): never => {
    throw new QErrors.RolledBack(reason);
  };

  /**
   * Run a callback in a savepoint of the transaction and return a QResult
   * holding the value returned by the callback. The callback receives a
   * datasource running its queries in the savepoint, savepoints can be nested.
   *
   * The savepoint is released when the callback returns, and rolled back
   * when it throws or a query failed in the savepoint: the transaction goes
   * on, only the savepoint queries are rolled back. It never throws,
   * `error.code` is:
   * - "ROLLED_BACK": the callback threw, the thrown error is the `cause`,
   * - "TRANSACTION_FAILED": a query failed in the savepoint (handled by the
   *   callback), or the savepoint couldn't be created, rolled back or
   *   released (the transaction then fails too),
   * - "TRANSACTION_CONFLICT": a conflict with a concurrent transaction, the
   *   transaction fails too (to be retried as a whole).
   *
   * With `onFailedQuery: "commit"`, a savepoint with a failed query handled
   * by the callback is released, not rolled back: its other queries are
   * committed with the transaction.
   *
   * Requires a dialect supporting savepoints (ie: Postgres, MySQL, SQL
   * Server, SQLite), the result is a "TRANSACTION_FAILED" error otherwise.
   * SQL Server has no RELEASE SAVEPOINT: its savepoints end with the
   * transaction.
   *
   * @example
   * ```typescript
   * await ds.transactionOrThrow(async (tx) => {
   *   await tx.queryOrThrow(insertOrder);
   *   // a duplicate tag is fine: only the savepoint is rolled back
   *   const { error } = await tx.savepoint(
   *     (sp) => sp.queryOrThrow(insertTag),
   *     { name: "insertTag" }
   *   );
   *   await tx.queryOrThrow(insertOrderLines);
   * });
   * ```
   */
  savepoint = async <TData>(
    fn: (tx: KyselyTransactionDatasource<TDatabase>) => Promise<TData>,
    options?: SavepointOptions
  ): AsyncQResult<TData> => {
    const context = this.transactionContext;
    if (context === undefined) {
      throw new Error("A savepoint requires a transaction");
    }
    savepointCounter++;
    const name = `flowblade_sp_${savepointCounter}`;
    // the savepoint names are checked by kysely types, not needed here
    const trx = this.getConnection() as ControlledTransaction<
      TDatabase,
      [string]
    >;
    return await runSavepoint<
      KyselyTransactionDatasourceImpl<TDatabase>,
      TData
    >({
      context,
      name,
      options,
      getErrorMessage: getKyselyErrorMessage,
      begin: async (spContext) => {
        await trx.savepoint(name).execute();
        return new KyselyTransactionDatasourceImpl<TDatabase>(this.#params, {
          ...spContext,
          signal: context.signal,
        });
      },
      rollback: async () => {
        await trx.rollbackToSavepoint(name).execute();
      },
      release: async () => {
        try {
          await trx.releaseSavepoint(name).execute();
        } catch (error) {
          // ie: SQL Server has no RELEASE SAVEPOINT, the savepoint ends with
          // the transaction
          if (
            !(error instanceof Error) ||
            error.message !== releaseSavepointNotSupportedMessage
          ) {
            throw error;
          }
        }
      },
      fn,
    });
  };

  /**
   * Like `savepoint()`, but return the value returned by the callback or
   * throw: the error thrown by the callback as is, a
   * `QErrors.TransactionFailed` or a `QErrors.TransactionConflict`.
   *
   * The savepoint is rolled back before throwing, but the error ends the
   * transaction callback too (and rolls back the whole transaction) unless
   * caught: catch it for the transaction to go on, or use `savepoint()`.
   */
  savepointOrThrow = async <TData>(
    fn: (tx: KyselyTransactionDatasource<TDatabase>) => Promise<TData>,
    options?: SavepointOrThrowOptions
  ): Promise<{ data: TData; meta: QMeta }> => {
    const result = await this.savepoint(fn, options);
    return {
      data: getDataOrThrow(result, { onError: options?.onError }),
      meta: result.meta,
    };
  };
}

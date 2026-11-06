import type { QErrorFactory } from "../errors/q-error-factories";
import type { QMeta } from "../meta/q-meta";
import type { AsyncQResult } from "../query-result/types";
import type { DatasourceInterface } from "./datasource.interface";

/**
 * Transaction isolation level, support depends on the database
 * (ie: "snapshot" is SQL Server specific).
 */
export type TransactionIsolationLevel =
  | "read uncommitted"
  | "read committed"
  | "repeatable read"
  | "serializable"
  | "snapshot";

/**
 * Transaction access mode, support depends on the database.
 */
export type TransactionAccessMode = "read only" | "read write";

export type TransactionOptions = {
  /**
   * Name used to label your transaction, useful for logging and/or debugging.
   * Defaults to "anonymous" in the datasources.
   */
  name?: string;
  /**
   * Abort the transaction: the queries run in the transaction use it (combined
   * with their own `signal`) and an aborted transaction is never committed,
   * it's rolled back and the result is an "ABORTED" error.
   */
  signal?: AbortSignal;
  /**
   * Isolation level, defaults to the database default (ie: "read committed").
   */
  isolationLevel?: TransactionIsolationLevel;
  /**
   * Access mode, defaults to the database default (ie: "read write").
   */
  accessMode?: TransactionAccessMode;
  /**
   * Run the transaction again when it conflicts with a concurrent one
   * ("TRANSACTION_CONFLICT": serialization failure, deadlock...), the callback
   * is called again: keep its side effects in the transaction.
   *
   * @example
   * ```typescript
   * { retry: { maxRetries: 3 } } // waits 50ms, 100ms then 200ms
   * { retry: { maxRetries: 5, delayMs: (retry) => retry * 100 } }
   * ```
   */
  retry?: TransactionRetryOptions;
  /**
   * What to do when a query failed in the transaction but the callback
   * handled the error (ie: `tx.query()` never throws) and returned:
   * - "rollback" (default): roll back, the result is a "TRANSACTION_FAILED"
   *   error. Most databases abort the transaction on error (ie: Postgres,
   *   DuckDB) and silently roll back on commit.
   * - "commit": commit anyway, for the databases where a failed statement
   *   doesn't abort the transaction (ie: SQL Server without XACT_ABORT, MySQL),
   *   ie: an insert failing with a duplicate key handled by the callback.
   *   Never with Postgres: the commit would silently roll back. A conflict is
   *   never committed ("TRANSACTION_CONFLICT").
   *
   * Prefer a savepoint when supported (ie: `tx.savepoint()` of the Kysely
   * datasource): only the savepoint is rolled back.
   */
  onFailedQuery?: "rollback" | "commit";
};

export type TransactionRetryOptions = {
  /**
   * Retries after the first attempt, a non-negative integer.
   */
  maxRetries: number;
  /**
   * Delay before a retry in milliseconds, or a function of the retry number
   * (1 for the first retry). Defaults to an exponential backoff: 50ms, 100ms,
   * 200ms... up to 1s.
   */
  delayMs?: number | ((retry: number) => number);
};

/**
 * Options of `transactionOrThrow()`.
 */
export type TransactionOrThrowOptions = TransactionOptions & {
  /**
   * Create the error thrown when the transaction fails, rather than the
   * default one (received as `error`): the error thrown by the callback
   * (ie: a `QErrors.QueryFailed` or a `QErrors.RolledBack`), a
   * `QErrors.TransactionFailed` or a `QErrors.Aborted`.
   */
  onError?: QErrorFactory;
};

/**
 * Methods added to the datasource received by the transaction callback.
 */
export interface TransactionScopeInterface {
  /**
   * Roll back the transaction: throws a `QErrors.RolledBack` that ends the
   * callback, don't catch it in the callback.
   *
   * `transaction()` then returns a "ROLLED_BACK" error with the
   * `QErrors.RolledBack` as cause, `transactionOrThrow()` throws it.
   *
   * @param reason appended to the error message
   */
  rollback: (reason?: string) => never;
}

/**
 * Datasource supporting transactions. The callback receives a datasource
 * (`TTx`) running its queries in the transaction: the transaction is committed
 * when the callback returns, and rolled back when it throws or calls
 * `tx.rollback()`.
 *
 * Nested transactions aren't supported, the transaction datasource doesn't
 * expose `transaction()` / `transactionOrThrow()`.
 */
export type SavepointOptions = {
  /**
   * Name used to label the savepoint in the meta (the SQL savepoint name is
   * generated). Defaults to the generated name.
   */
  name?: string;
};

export type SavepointOrThrowOptions = SavepointOptions & {
  /**
   * Create the error thrown when the savepoint fails, rather than the
   * default one (received as `error`).
   */
  onError?: QErrorFactory;
};

/**
 * Savepoints of a transaction datasource (ie: Kysely, not DuckDB): a part
 * of the transaction that can be rolled back alone.
 */
export interface TransactionSavepointInterface<TTx> {
  /**
   * Run a callback in a savepoint of the transaction and return a QResult
   * holding the value returned by the callback. The callback receives a
   * datasource running its queries in the savepoint, savepoints can be nested.
   *
   * The savepoint is released when the callback returns, and rolled back
   * when it throws (or calls `tx.rollback()`) or a query failed in the
   * savepoint: the transaction goes on, only the savepoint queries are
   * rolled back. It never throws, `error.code` is:
   * - "ROLLED_BACK": the callback threw, the thrown error is the `cause`,
   * - "TRANSACTION_FAILED": a query failed in the savepoint (handled by the
   *   callback), or the savepoint couldn't be created, rolled back or
   *   released (the transaction then fails too),
   * - "TRANSACTION_CONFLICT": a conflict with a concurrent transaction, the
   *   transaction fails too (to be retried as a whole).
   *
   * @example
   * ```typescript
   * await ds.transactionOrThrow(async (tx) => {
   *   await tx.queryOrThrow(insertOrder);
   *   // ie: a duplicate is fine, the transaction goes on
   *   const { error } = await tx.savepoint((sp) => sp.queryOrThrow(insertTag));
   *   await tx.queryOrThrow(insertOrderLines);
   * });
   * ```
   */
  savepoint: <TData>(
    fn: (tx: TTx) => Promise<TData>,
    options?: SavepointOptions
  ) => AsyncQResult<TData>;

  /**
   * Like `savepoint()`, but return the value returned by the callback or
   * throw (the error thrown by the callback as is, a
   * `QErrors.TransactionFailed` or a `QErrors.TransactionConflict`).
   */
  savepointOrThrow: <TData>(
    fn: (tx: TTx) => Promise<TData>,
    options?: SavepointOrThrowOptions
  ) => Promise<{ data: TData; meta: QMeta }>;
}

/**
 * Datasource received by the transaction callbacks, whatever the datasource:
 * the default `tx` of `TransactionalDatasourceInterface`.
 */
export type TransactionDatasourceInterface = DatasourceInterface &
  TransactionScopeInterface;

/**
 * @example
 * ```typescript
 * // Code working with any transactional datasource (ie: Kysely, DuckDB)
 * const transfer = (ds: TransactionalDatasourceInterface, query: unknown) =>
 *   ds.transactionOrThrow(async (tx) => {
 *     await tx.queryOrThrow(query);
 *   });
 * ```
 */
export interface TransactionalDatasourceInterface<
  TTx extends TransactionScopeInterface = TransactionDatasourceInterface,
> {
  /**
   * Run a callback in a transaction and return a QResult holding the value
   * returned by the callback.
   *
   * It never throws, `error.code` is:
   * - "ROLLED_BACK": the callback threw (ie: a failed `tx.queryOrThrow()`) or
   *   called `tx.rollback()`, the thrown error is the `cause`,
   * - "TRANSACTION_FAILED": a query failed in the transaction (handled by
   *   the callback or not, it's then rolled back), or the transaction
   *   couldn't begin, commit or roll back, the driver error is the `cause`,
   * - "TRANSACTION_CONFLICT": the transaction conflicts with a concurrent one
   *   (ie: serialization failure, deadlock), it can be retried (see `retry`),
   * - "ABORTED": aborted with `signal`, the abort reason is the `cause`.
   *
   * `meta` holds a "transaction" span followed by the spans of the queries
   * run in the transaction.
   *
   * Note: a failed query is never committed, even when handled by the
   * callback (ie: `tx.query()` never throws): most databases abort the
   * transaction on error and silently roll back on commit. Prefer the
   * throwing methods (ie: `tx.queryOrThrow()`) in the callback.
   *
   * @example
   * ```typescript
   * const { data: orderId, error, meta } = await ds.transaction(
   *   async (tx) => {
   *     const { data: order } = await tx.queryOneOrThrow(insertOrder);
   *     await tx.queryOrThrow(insertOrderLines(order.id));
   *     return order.id;
   *   },
   *   { name: "createOrder", isolationLevel: "serializable" }
   * );
   * if (error) {
   *   // "ROLLED_BACK", "TRANSACTION_FAILED" or "ABORTED"
   *   console.error(error.code, error.message, error.cause);
   * }
   * ```
   */
  transaction: <TData>(
    fn: (tx: TTx) => Promise<TData>,
    options?: TransactionOptions
  ) => AsyncQResult<TData>;

  /**
   * Run a callback in a transaction and return the value returned by the
   * callback, or throw when the transaction is rolled back or fails.
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
   * const { data: orderId, meta } = await ds.transactionOrThrow(
   *   async (tx) => {
   *     const { data: order } = await tx.queryOneOrThrow(insertOrder);
   *     await tx.queryOrThrow(insertOrderLines(order.id));
   *     return order.id;
   *   },
   *   { name: "createOrder" }
   * );
   * ```
   */
  transactionOrThrow: <TData>(
    fn: (tx: TTx) => Promise<TData>,
    options?: TransactionOrThrowOptions
  ) => Promise<{ data: TData; meta: QMeta }>;
}

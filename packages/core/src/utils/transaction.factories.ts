import type { TransactionOptions } from "../datasource/transaction.interface";
import {
  QMeta,
  type QMetaSpan,
  type QMetaTransactionSpan,
} from "../meta/q-meta";
import { QResult } from "../query-result/q-result";
import type { AsyncQResult, QError } from "../query-result/types";
import { isError } from "./brand";

/**
 * Received by `begin`, for the transaction datasource to report its queries.
 */
export type TransactionBeginContext = {
  /**
   * Report the span of a query run in the transaction (succeeded or failed),
   * added to the result meta.
   */
  addSpan: (span: QMetaSpan) => void;
  /**
   * Report a failed query (the driver error), even when the callback handles
   * it: the transaction is then rolled back rather than committed. Most
   * databases abort the transaction on error (ie: Postgres, DuckDB), and
   * silently roll back on commit.
   */
  onQueryFailed: (error: unknown) => void;
};

export type RunTransactionParams<TTx, TData> = {
  /**
   * Begin the transaction and return what the callback and `commit` /
   * `rollback` receive (ie: the transaction datasource), which reports its
   * queries through the `context`.
   */
  begin: (context: TransactionBeginContext) => Promise<TTx>;
  commit: (tx: TTx) => Promise<void>;
  /**
   * Roll back the transaction, also called after a failed commit to release
   * the transaction resources (its error is then ignored).
   */
  rollback: (tx: TTx) => Promise<void>;
  /**
   * The user callback, run between `begin` and `commit`.
   */
  fn: (tx: TTx) => Promise<TData>;
  options?: TransactionOptions | undefined;
  /**
   * Message of the driver errors, defaults to the error message.
   */
  getErrorMessage?: (error: unknown) => string;
};

const defaultGetErrorMessage = (error: unknown): string => {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
};

/**
 * Run a transaction and return its QResult, used to implement `transaction()`
 * (`TransactionalDatasourceInterface`): the datasource provides how to begin,
 * commit and roll back, `runTransaction` the flow and the result.
 *
 * - `begin` fails: a "TRANSACTION_FAILED" error with the driver error as cause
 *   ("ABORTED" when `signal` is aborted, ie: while waiting for a connection).
 * - `fn` throws (ie: `tx.rollback()`): rolled back, a "ROLLED_BACK" error
 *   with the thrown value as cause.
 * - a query reported with `onQueryFailed`, but `fn` returns (ie: it handled
 *   the error): never committed, rolled back with a "TRANSACTION_FAILED"
 *   error with the first query error as cause.
 * - `commit` fails: rolled back, a "TRANSACTION_FAILED" error with the
 *   driver error as cause.
 * - `rollback` fails: a "TRANSACTION_FAILED" error with an `AggregateError`
 *   as cause (`errors`: the rollback error then the callback error).
 * - `signal` aborted: never committed, an "ABORTED" error with the abort
 *   reason as cause.
 *
 * The result meta (named after `options.name`) holds a "transaction" span
 * followed by the spans reported with `addSpan`.
 *
 * The transaction datasource must report its queries: call `addSpan` for
 * each query and `onQueryFailed` for each failed one.
 *
 * @example
 * ```typescript
 * transaction = <TData>(fn: (tx: MyTxDatasource) => Promise<TData>, options?: TransactionOptions) =>
 *   runTransaction({
 *     fn,
 *     options,
 *     begin: async (context) => {
 *       const conn = await this.driver.begin(options?.isolationLevel);
 *       // calls addSpan() and onQueryFailed() for its queries
 *       return new MyTxDatasource({ conn, context, signal: options?.signal });
 *     },
 *     commit: (tx) => tx.conn.commit(),
 *     rollback: (tx) => tx.conn.rollback(),
 *   });
 * ```
 */
export const runTransaction = async <TTx, TData>(
  params: RunTransactionParams<TTx, TData>
): AsyncQResult<TData> => {
  const {
    begin,
    commit,
    rollback,
    fn,
    options = {},
    getErrorMessage = defaultGetErrorMessage,
  } = params;
  const { name = "anonymous", signal, isolationLevel, accessMode } = options;

  const spans: QMetaSpan[] = [];
  let timeMs = 0;
  let queryError: { error: unknown } | undefined;

  const timed = async <T>(operation: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      timeMs += Date.now() - start;
    }
  };

  const createMeta = (status: QMetaTransactionSpan["status"]): QMeta => {
    const span: QMetaTransactionSpan = { type: "transaction", status, timeMs };
    if (isolationLevel !== undefined) {
      span.isolationLevel = isolationLevel;
    }
    if (accessMode !== undefined) {
      span.accessMode = accessMode;
    }
    return new QMeta({ name, spans: [span, ...spans] });
  };

  const failure = (
    status: QMetaTransactionSpan["status"],
    error: QError
  ): QResult<TData, QError> =>
    new QResult<TData, QError>({ meta: createMeta(status), error });

  const aborted = (status: QMetaTransactionSpan["status"]) =>
    failure(status, {
      message: getErrorMessage(signal?.reason),
      code: "ABORTED",
      cause: signal?.reason,
    });

  const transactionFailed = (error: unknown, message?: string) =>
    failure("failed", {
      message: message ?? getErrorMessage(error),
      code: "TRANSACTION_FAILED",
      cause: error,
    });

  // a function: TS would keep the narrowing of a first `signal.aborted` check
  const isAborted = (): boolean => signal?.aborted === true;

  if (isAborted()) {
    return aborted("failed");
  }

  let tx: TTx;
  try {
    tx = await timed(() =>
      begin({
        addSpan: (span) => {
          spans.push(span);
        },
        onQueryFailed: (error) => {
          queryError ??= { error };
        },
      })
    );
  } catch (error) {
    // ie: aborted while waiting for a connection or a lock
    return isAborted() ? aborted("failed") : transactionFailed(error);
  }

  /**
   * Roll back, return the failure when it fails.
   */
  const rollbackOrFail = async (
    error: unknown
  ): Promise<QResult<TData, QError> | undefined> => {
    try {
      await timed(() => rollback(tx));
      return undefined;
    } catch (rollbackError) {
      const message = `Rollback failed: ${getErrorMessage(rollbackError)}`;
      return transactionFailed(
        new AggregateError([rollbackError, error], message),
        message
      );
    }
  };

  let data: TData;
  try {
    data = await fn(tx);
    // Never commit an aborted transaction
    signal?.throwIfAborted();
  } catch (error) {
    const rollbackFailure = await rollbackOrFail(error);
    if (rollbackFailure !== undefined) {
      return rollbackFailure;
    }
    if (isAborted()) {
      return aborted("rolled back");
    }
    return failure("rolled back", {
      message: getErrorMessage(error),
      code: "ROLLED_BACK",
      cause: error,
    });
  }

  // Never commit after a failed query, handled by the callback or not
  if (queryError !== undefined) {
    const { error } = queryError;
    return (
      (await rollbackOrFail(error)) ??
      failure("rolled back", {
        message: `A query failed in the transaction, it can't be committed: ${getErrorMessage(error)}`,
        code: "TRANSACTION_FAILED",
        cause: error,
      })
    );
  }

  try {
    await timed(() => commit(tx));
  } catch (error) {
    // Release the transaction: some drivers keep it open on a failed commit
    await timed(() => rollback(tx)).catch(() => undefined);
    return transactionFailed(error);
  }

  return new QResult<TData, QError>({
    meta: createMeta("committed"),
    data,
    shape: Array.isArray(data) ? "many" : "one",
  });
};

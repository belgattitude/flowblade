import type {
  TransactionOptions,
  TransactionRetryOptions,
} from "../datasource/transaction.interface";
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
  /**
   * Throw when the callback has returned (or thrown): call it before each
   * query of the transaction datasource, a query run after (ie: a transaction
   * datasource kept for later, a query not awaited) would otherwise run
   * outside of the transaction, or in another one.
   */
  assertActive: () => void;
};

/**
 * Message of the error thrown by `assertActive()`.
 */
const transactionEndedMessage =
  "The transaction has ended, run its queries in the callback and await them";

export type RunTransactionParams<TTx, TData> = {
  /**
   * Begin the transaction and return what the callback and `commit` /
   * `rollback` receive (ie: the transaction datasource), which reports its
   * queries through the `context`. Called again for each retry.
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
  /**
   * Whether a driver error is a conflict with a concurrent transaction
   * (ie: Postgres serialization failure "40001"), reported as a
   * "TRANSACTION_CONFLICT" error that can be retried. The error causes are
   * checked too (ie: the driver error of a `QErrors.QueryFailed`).
   */
  isConflictError?: (error: unknown) => boolean;
  /**
   * Called before a retry, ie: to log it.
   */
  onRetry?: (info: { retry: number; delayMs: number; error: QError }) => void;
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
 * Default retry delay: exponential backoff, 50ms, 100ms, 200ms... up to 1s.
 */
const defaultRetryDelayMs = (retry: number): number =>
  Math.min(1000, 25 * 2 ** retry);

/**
 * The error, or one of its causes, matching `predicate`.
 */
const findInCauses = (
  error: unknown,
  predicate: (error: unknown) => boolean
): unknown => {
  let current = error;
  // bounded: causes can be cyclic
  for (let depth = 0; depth < 5 && current !== undefined; depth++) {
    if (predicate(current)) {
      return current;
    }
    current = isError(current) ? current.cause : undefined;
  }
  return undefined;
};

const isValidRetry = (retry: TransactionRetryOptions | undefined): boolean =>
  retry === undefined ||
  (Number.isInteger(retry.maxRetries) && retry.maxRetries >= 0);

/**
 * Wait, rejects with the abort reason when aborted.
 */
const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  signal?.throwIfAborted();
  // not Promise.withResolvers(): not supported by the targeted browsers
  // oxlint-disable-next-line promise/avoid-new -- wraps setTimeout
  await new Promise<void>((resolve, reject) => {
    const pending: { timer?: ReturnType<typeof setTimeout> } = {};
    const onAbort = () => {
      clearTimeout(pending.timer);
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- the abort reason, like signal.throwIfAborted()
      reject(signal?.reason);
    };
    pending.timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

/**
 * Run one attempt of the transaction, see `runTransaction()`.
 */
const runAttempt = async <TTx, TData>(
  params: RunTransactionParams<TTx, TData>,
  retries: number
): AsyncQResult<TData> => {
  const {
    begin,
    commit,
    rollback,
    fn,
    options = {},
    getErrorMessage = defaultGetErrorMessage,
    isConflictError,
  } = params;
  const { name = "anonymous", signal, isolationLevel, accessMode } = options;

  const spans: QMetaSpan[] = [];
  let timeMs = 0;
  let queryError: { error: unknown } | undefined;
  let ended = false;

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
    if (retries > 0) {
      span.retries = retries;
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

  /**
   * A "TRANSACTION_CONFLICT" failure when the error (or a cause) is a
   * conflict, with the message of the conflict error.
   */
  const conflict = (
    status: QMetaTransactionSpan["status"],
    error: unknown
  ): QResult<TData, QError> | undefined => {
    if (isConflictError === undefined) {
      return undefined;
    }
    const conflictError = findInCauses(error, isConflictError);
    return conflictError === undefined
      ? undefined
      : failure(status, {
          message: getErrorMessage(conflictError),
          code: "TRANSACTION_CONFLICT",
          cause: error,
        });
  };

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
        assertActive: () => {
          if (ended) {
            throw new Error(transactionEndedMessage);
          }
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
    try {
      data = await fn(tx);
    } finally {
      ended = true;
    }
    // Never commit an aborted transaction
    signal?.throwIfAborted();
  } catch (error) {
    const rollbackFailure = await rollbackOrFail(error);
    if (rollbackFailure !== undefined) {
      // the database rolls back on conflict (ie: SQL Server deadlock victim),
      // the rollback then fails: report the conflict
      return conflict("rolled back", error) ?? rollbackFailure;
    }
    if (isAborted()) {
      return aborted("rolled back");
    }
    return (
      conflict("rolled back", error) ??
      failure("rolled back", {
        message: getErrorMessage(error),
        code: "ROLLED_BACK",
        cause: error,
      })
    );
  }

  // Never commit after a failed query, handled by the callback or not
  if (queryError !== undefined) {
    const { error } = queryError;
    const rollbackFailure = await rollbackOrFail(error);
    return (
      // the database rolls back on conflict, the rollback might then fail
      conflict("rolled back", error) ??
      rollbackFailure ??
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
    return conflict("failed", error) ?? transactionFailed(error);
  }

  return new QResult<TData, QError>({
    meta: createMeta("committed"),
    data,
    shape: Array.isArray(data) ? "many" : "one",
  });
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
 * - a conflict (`isConflictError` matches the error thrown by `fn`, the
 *   failed query or commit error, or one of their causes): a
 *   "TRANSACTION_CONFLICT" error, run again when `options.retry` allows it.
 * - `rollback` fails: a "TRANSACTION_FAILED" error with an `AggregateError`
 *   as cause (`errors`: the rollback error then the callback error), unless
 *   the callback error is a conflict (the database rolled back already, ie:
 *   SQL Server deadlock victim).
 * - `signal` aborted: never committed, an "ABORTED" error with the abort
 *   reason as cause.
 *
 * The result meta (named after `options.name`) holds a "transaction" span
 * followed by the spans reported with `addSpan` (of the last attempt).
 *
 * The transaction datasource must report its queries: call `assertActive`
 * before each query, `addSpan` for each query and `onQueryFailed` for each
 * failed one.
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
 *     isConflictError: (error) => (error as { code?: unknown }).code === "40001",
 *   });
 * ```
 */
export const runTransaction = async <TTx, TData>(
  params: RunTransactionParams<TTx, TData>
): AsyncQResult<TData> => {
  const { options, onRetry } = params;
  const retry = options?.retry;
  if (!isValidRetry(retry)) {
    // never throws, like the other failures
    return new QResult<TData, QError>({
      meta: new QMeta({ name: options?.name ?? "anonymous" }),
      error: {
        message: `retry.maxRetries must be a non-negative integer, got ${retry?.maxRetries}`,
        code: "TRANSACTION_FAILED",
      },
    });
  }
  const maxRetries = retry?.maxRetries ?? 0;
  const { delayMs = defaultRetryDelayMs } = retry ?? {};
  const signal = options?.signal;

  let retries = 0;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- attempts are sequential
    const result = await runAttempt(params, retries);
    if (
      result.error?.code !== "TRANSACTION_CONFLICT" ||
      retries >= maxRetries
    ) {
      return result;
    }
    retries++;
    const wait = typeof delayMs === "number" ? delayMs : delayMs(retries);
    onRetry?.({ retry: retries, delayMs: wait, error: result.error });
    try {
      // oxlint-disable-next-line no-await-in-loop -- attempts are sequential
      await sleep(wait, signal);
    } catch {
      // aborted while waiting: the next attempt returns "ABORTED"
    }
  }
};

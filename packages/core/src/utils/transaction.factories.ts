import type {
  SavepointOptions,
  TransactionOptions,
  TransactionRetryOptions,
} from "../datasource/transaction.interface";
import {
  QMeta,
  type QMetaSavepointSpan,
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
  /**
   * Track a query of the transaction datasource (its promise, settled when
   * the query ends): the transaction waits for the tracked queries before
   * it ends, a query not awaited by the callback (a bug) then still runs in
   * the transaction rather than racing the commit.
   */
  trackQuery: <T>(query: Promise<T>) => Promise<T>;
  /**
   * The transaction `onFailedQuery` option, applied to its savepoints too.
   */
  readonly onFailedQuery: "rollback" | "commit";
  /**
   * Whether an error (or a cause) is a conflict with a concurrent transaction.
   */
  readonly isConflict: (error: unknown) => boolean;
};

/**
 * Minimal logger used by `runTransaction()`, ie: a logtape `Logger`.
 */
export type TransactionLogger = {
  debug: (message: string, properties?: Record<string, unknown>) => void;
  info: (message: string, properties?: Record<string, unknown>) => void;
  warn: (message: string, properties?: Record<string, unknown>) => void;
  error: (message: string, properties?: Record<string, unknown>) => void;
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
   * Called before a retry.
   */
  onRetry?: (info: { retry: number; delayMs: number; error: QError }) => void;
  /**
   * Log the transaction: its beginning (debug), retries (warn) and result
   * (info when committed, warn when rolled back or conflicting, error when
   * failed). The log properties hold `source` (ie: "kysely").
   */
  log?: { logger: TransactionLogger; source: string };
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
 * Log the result of a transaction, and return it.
 */
const logResult = <TData>(
  result: QResult<TData, QError>,
  logger: TransactionLogger | undefined,
  logProps: Record<string, unknown>
): QResult<TData, QError> => {
  if (logger === undefined) {
    return result;
  }
  const { meta, error } = result;
  const [span] = meta.getSpansByType("transaction");
  const props = {
    ...logProps,
    status: span?.status,
    ...(span?.retries === undefined ? {} : { retries: span.retries }),
    queryCount: meta.getSpans().length - (span === undefined ? 0 : 1),
    timeMs: meta.getTotalTimeMs(),
  };
  if (error === undefined) {
    logger.info(
      'Transaction "{transactionName}" committed in {timeMs}ms, {queryCount} query(ies)',
      props
    );
    return result;
  }
  const errorProps = { ...props, errorMessage: error.message };
  if (error.code === "TRANSACTION_FAILED") {
    logger.error(
      'Transaction "{transactionName}" failed: {errorMessage}',
      errorProps
    );
  } else if (error.code === "TRANSACTION_CONFLICT") {
    logger.warn(
      'Transaction "{transactionName}" conflicts with a concurrent one: {errorMessage}',
      errorProps
    );
  } else {
    logger.warn(
      'Transaction "{transactionName}" rolled back: {errorMessage}',
      errorProps
    );
  }
  return result;
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
  const {
    name = "anonymous",
    signal,
    isolationLevel,
    accessMode,
    onFailedQuery = "rollback",
  } = options;

  const spans: QMetaSpan[] = [];
  let timeMs = 0;
  let queryError: { error: unknown } | undefined;
  let ended = false;
  const pendingQueries = new Set<Promise<unknown>>();

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
        onFailedQuery,
        isConflict: (error) =>
          isConflictError !== undefined &&
          findInCauses(error, isConflictError) !== undefined,
        trackQuery: (query) => {
          pendingQueries.add(query);
          const untrack = async () => {
            await Promise.allSettled([query]);
            pendingQueries.delete(query);
          };
          void untrack();
          return query;
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
      // queries not awaited by the callback: never end before them, new
      // queries are rejected (assertActive)
      while (pendingQueries.size > 0) {
        // oxlint-disable-next-line no-await-in-loop -- until all settled
        await Promise.allSettled(pendingQueries);
      }
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

  // Never commit after a failed query, handled by the callback or not, unless
  // allowed by onFailedQuery (never for a conflict: rolled back by the database)
  if (
    queryError !== undefined &&
    (onFailedQuery !== "commit" ||
      (isConflictError !== undefined &&
        findInCauses(queryError.error, isConflictError) !== undefined))
  ) {
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
 *   error with the first query error as cause (committed with
 *   `options.onFailedQuery: "commit"`, unless a conflict).
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
 * before each query, `trackQuery` with each query, `addSpan` for each query
 * and `onQueryFailed` for each failed one.
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
  const { options, onRetry, log } = params;
  const name = options?.name ?? "anonymous";
  const logProps = {
    transactionName: name,
    source: log?.source,
    method: "transaction",
    ...(options?.isolationLevel === undefined
      ? {}
      : { isolationLevel: options.isolationLevel }),
    ...(options?.accessMode === undefined
      ? {}
      : { accessMode: options.accessMode }),
  };
  log?.logger.debug('Beginning transaction "{transactionName}"', logProps);

  const retry = options?.retry;
  if (!isValidRetry(retry)) {
    // never throws, like the other failures
    return logResult(
      new QResult<TData, QError>({
        meta: new QMeta({ name }),
        error: {
          message: `retry.maxRetries must be a non-negative integer, got ${retry?.maxRetries}`,
          code: "TRANSACTION_FAILED",
        },
      }),
      log?.logger,
      logProps
    );
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
      return logResult(result, log?.logger, logProps);
    }
    retries++;
    const wait = typeof delayMs === "number" ? delayMs : delayMs(retries);
    log?.logger.warn(
      'Transaction "{transactionName}" conflicts with a concurrent one, retry {retry} in {delayMs}ms: {errorMessage}',
      {
        ...logProps,
        retry: retries,
        delayMs: wait,
        errorMessage: result.error.message,
      }
    );
    onRetry?.({ retry: retries, delayMs: wait, error: result.error });
    try {
      // oxlint-disable-next-line no-await-in-loop -- attempts are sequential
      await sleep(wait, signal);
    } catch {
      // aborted while waiting: the next attempt returns "ABORTED"
    }
  }
};

export type RunSavepointParams<TSp, TData> = {
  /**
   * The context of the transaction (or of the enclosing savepoint).
   */
  context: TransactionBeginContext;
  /**
   * Create the savepoint and return what the callback, `rollback` and
   * `release` receive (ie: the savepoint datasource), which reports its
   * queries through the savepoint `context`.
   */
  begin: (context: TransactionBeginContext) => Promise<TSp>;
  /**
   * Roll back to the savepoint.
   */
  rollback: (sp: TSp) => Promise<void>;
  /**
   * Release the savepoint.
   */
  release: (sp: TSp) => Promise<void>;
  fn: (sp: TSp) => Promise<TData>;
  /**
   * Label of the savepoint, the default name of the result meta.
   */
  name: string;
  options?: SavepointOptions | undefined;
  /**
   * Message of the driver errors, defaults to the error message.
   */
  getErrorMessage?: (error: unknown) => string;
};

/**
 * Run a savepoint of a transaction and return its QResult, used to implement
 * `tx.savepoint()` (`TransactionSavepointInterface`): the datasource provides
 * how to create, roll back to and release the savepoint, `runSavepoint` the
 * flow and the result.
 *
 * Like `runTransaction()`, with the transaction going on when the savepoint
 * is rolled back:
 * - `fn` throws: rolled back to the savepoint, a "ROLLED_BACK" error.
 * - a failed query (handled by `fn`): rolled back to the savepoint, a
 *   "TRANSACTION_FAILED" error (released with the transaction
 *   `onFailedQuery: "commit"` option).
 * - a conflict: rolled back, a "TRANSACTION_CONFLICT" error, and the
 *   transaction fails too (to be retried as a whole).
 * - `begin`, `rollback` or `release` fail: a "TRANSACTION_FAILED" error, and
 *   the transaction fails too (it can't be committed).
 *
 * The result meta holds a "savepoint" span followed by the spans of the
 * savepoint queries, the transaction meta gets them too.
 */
export const runSavepoint = async <TSp, TData>(
  params: RunSavepointParams<TSp, TData>
): AsyncQResult<TData> => {
  const {
    context: parent,
    begin,
    rollback,
    release,
    fn,
    getErrorMessage = defaultGetErrorMessage,
  } = params;
  const name = params.options?.name ?? params.name;

  const spans: QMetaSpan[] = [];
  let timeMs = 0;
  let queryError: { error: unknown } | undefined;
  let ended = false;
  const pendingQueries = new Set<Promise<unknown>>();

  const timed = async <T>(operation: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      timeMs += Date.now() - start;
    }
  };

  const failure = (
    status: QMetaSavepointSpan["status"],
    error: QError
  ): QResult<TData, QError> => {
    const span: QMetaSavepointSpan = {
      type: "savepoint",
      name,
      status,
      timeMs,
    };
    // reported to the transaction too, after the savepoint queries
    parent.addSpan(span);
    return new QResult<TData, QError>({
      meta: new QMeta({ name, spans: [span, ...spans] }),
      error,
    });
  };

  /**
   * The savepoint statements can't fail without breaking the transaction.
   */
  const savepointFailed = (error: unknown, message?: string) => {
    parent.onQueryFailed(error);
    return failure("failed", {
      message: message ?? getErrorMessage(error),
      code: "TRANSACTION_FAILED",
      cause: error,
    });
  };

  try {
    parent.assertActive();
  } catch (error) {
    return failure("failed", {
      message: getErrorMessage(error),
      code: "TRANSACTION_FAILED",
      cause: error,
    });
  }

  let sp: TSp;
  try {
    sp = await timed(() =>
      begin({
        addSpan: (span) => {
          spans.push(span);
          parent.addSpan(span);
        },
        onQueryFailed: (error) => {
          queryError ??= { error };
          // a conflict fails the whole transaction (to be retried)
          if (parent.isConflict(error)) {
            parent.onQueryFailed(error);
          }
        },
        assertActive: () => {
          parent.assertActive();
          if (ended) {
            throw new Error(transactionEndedMessage);
          }
        },
        trackQuery: (query) => {
          pendingQueries.add(query);
          const untrack = async () => {
            await Promise.allSettled([query]);
            pendingQueries.delete(query);
          };
          void untrack();
          return parent.trackQuery(query);
        },
        onFailedQuery: parent.onFailedQuery,
        isConflict: parent.isConflict,
      })
    );
  } catch (error) {
    return savepointFailed(error);
  }

  /**
   * Roll back to the savepoint, return the failure when it fails.
   */
  const rollbackOrFail = async (
    error: unknown
  ): Promise<QResult<TData, QError> | undefined> => {
    try {
      await timed(() => rollback(sp));
      return undefined;
    } catch (rollbackError) {
      const message = `Rollback to savepoint failed: ${getErrorMessage(rollbackError)}`;
      return savepointFailed(
        new AggregateError([rollbackError, error], message),
        message
      );
    }
  };

  const conflict = (error: unknown) => {
    if (!parent.isConflict(error)) {
      return undefined;
    }
    parent.onQueryFailed(error);
    return failure("rolled back", {
      message: getErrorMessage(error),
      code: "TRANSACTION_CONFLICT",
      cause: error,
    });
  };

  let data: TData;
  try {
    try {
      data = await fn(sp);
    } finally {
      ended = true;
      while (pendingQueries.size > 0) {
        // oxlint-disable-next-line no-await-in-loop -- until all settled
        await Promise.allSettled(pendingQueries);
      }
    }
  } catch (error) {
    return (
      (await rollbackOrFail(error)) ??
      conflict(error) ??
      failure("rolled back", {
        message: getErrorMessage(error),
        code: "ROLLED_BACK",
        cause: error,
      })
    );
  }

  if (
    queryError !== undefined &&
    (parent.onFailedQuery !== "commit" || parent.isConflict(queryError.error))
  ) {
    const { error } = queryError;
    return (
      (await rollbackOrFail(error)) ??
      conflict(error) ??
      failure("rolled back", {
        message: `A query failed in the savepoint, it was rolled back: ${getErrorMessage(error)}`,
        code: "TRANSACTION_FAILED",
        cause: error,
      })
    );
  }

  try {
    await timed(() => release(sp));
  } catch (error) {
    return savepointFailed(error);
  }

  const span: QMetaSavepointSpan = {
    type: "savepoint",
    name,
    status: "released",
    timeMs,
  };
  parent.addSpan(span);
  return new QResult<TData, QError>({
    meta: new QMeta({ name, spans: [span, ...spans] }),
    data,
    shape: Array.isArray(data) ? "many" : "one",
  });
};

import { AsyncLocalStorage } from "node:async_hooks";

import type { DuckDBConnection } from "@duckdb/node-api";
import type { TransactionBeginContext } from "@flowblade/core/datasource";

/**
 * Context of a transaction datasource: the transaction signal and the
 * reporting of its queries to `runTransaction()`.
 *
 * @internal
 */
export type DuckdbTransactionContext = TransactionBeginContext & {
  signal: AbortSignal | undefined;
};

type Waiter = {
  exclusive: boolean;
  grant: () => void;
};

/**
 * Release a lock, calling it more than once is a no-op.
 */
export type ReleaseLock = () => void;

/**
 * Async shared / exclusive lock (readers-writer), granted in request order:
 * - shared: queries and streams, run concurrently while no exclusive is
 *   held or waiting,
 * - exclusive: transactions, wait for the running queries and streams and
 *   hold the connection until released.
 *
 * Waiting with an aborted `signal` rejects with the abort reason.
 *
 * @internal
 */
export class SharedExclusiveLock {
  #shared = 0;
  #exclusive = false;
  readonly #queue: Waiter[] = [];

  acquireShared = (signal?: AbortSignal): Promise<ReleaseLock> =>
    this.#acquire(false, signal);

  /**
   * Whether acquiring a shared lock now would wait (ie: for a transaction).
   */
  isSharedBusy = (): boolean =>
    this.#queue.length > 0 || !this.#canGrant(false);

  acquireExclusive = (signal?: AbortSignal): Promise<ReleaseLock> =>
    this.#acquire(true, signal);

  #canGrant(exclusive: boolean): boolean {
    return !this.#exclusive && (!exclusive || this.#shared === 0);
  }

  #take(exclusive: boolean): ReleaseLock {
    if (exclusive) {
      this.#exclusive = true;
    } else {
      this.#shared++;
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      if (exclusive) {
        this.#exclusive = false;
      } else {
        this.#shared--;
      }
      this.#drain();
    };
  }

  #drain(): void {
    let [head] = this.#queue;
    while (head !== undefined && this.#canGrant(head.exclusive)) {
      this.#queue.shift();
      head.grant();
      [head] = this.#queue;
    }
  }

  async #acquire(
    exclusive: boolean,
    signal: AbortSignal | undefined
  ): Promise<ReleaseLock> {
    signal?.throwIfAborted();
    // FIFO: never pass a waiter, an exclusive one would starve
    if (this.#queue.length === 0 && this.#canGrant(exclusive)) {
      return this.#take(exclusive);
    }
    const { promise, resolve, reject } = Promise.withResolvers<ReleaseLock>();
    const waiter: Waiter = {
      exclusive,
      grant: () => {
        // oxlint-disable-next-line no-use-before-define -- mutual reference, only called later
        signal?.removeEventListener("abort", onAbort);
        resolve(this.#take(exclusive));
      },
    };
    const onAbort = () => {
      const idx = this.#queue.indexOf(waiter);
      if (idx !== -1) {
        this.#queue.splice(idx, 1);
        // the removed waiter might have blocked the next ones
        this.#drain();
      }
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- the abort reason, like signal.throwIfAborted()
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    this.#queue.push(waiter);
    return await promise;
  }
}

/**
 * The lock held by an async context: by a transaction callback (exclusive,
 * with its `transaction`) or a `withConnectionLock()` callback (shared).
 *
 * @internal
 */
export type ConnectionHold = {
  readonly lock: SharedExclusiveLock;
  /**
   * Set when the lock is released: the async tasks started in the context
   * and still running then wait for the lock like any other.
   */
  released: boolean;
  readonly transaction?: DuckdbTransactionContext;
};

const holdStorage = new AsyncLocalStorage<readonly ConnectionHold[]>();

/**
 * Return the hold of the lock by the current async context, if any.
 *
 * @internal
 */
export const getContextHold = (
  lock: SharedExclusiveLock
): ConnectionHold | undefined =>
  holdStorage
    .getStore()
    ?.findLast((hold) => hold.lock === lock && !hold.released);

/**
 * Run `fn` in an async context holding the lock.
 *
 * @internal
 */
export const runWithHold = <T>(hold: ConnectionHold, fn: () => T): T =>
  holdStorage.run([...(holdStorage.getStore() ?? []), hold], fn);

const connectionLocks = new WeakMap<DuckDBConnection, SharedExclusiveLock>();

/**
 * Lock of a connection, shared by all the datasources using it.
 *
 * @internal
 */
export const getConnectionLock = (
  connection: DuckDBConnection
): SharedExclusiveLock => {
  let lock = connectionLocks.get(connection);
  if (lock === undefined) {
    lock = new SharedExclusiveLock();
    connectionLocks.set(connection, lock);
  }
  return lock;
};

/**
 * Run `fn` holding the lock of a DuckDB connection, for code using the
 * connection directly (ie: `getConnection()`): a `DuckdbDatasource`
 * transaction on the same connection doesn't begin while `fn` runs, and `fn`
 * waits for a running one.
 *
 * - Reentrant: in `fn`, the datasource queries and nested `withConnectionLock()`
 *   calls on the same connection don't wait for the lock again.
 * - In a transaction callback (the connection is held by the transaction),
 *   `fn` runs in the transaction: an error thrown by `fn` prevents the commit.
 * - Beginning a transaction on the same connection in `fn` fails, it would
 *   wait for `fn` forever.
 *
 * @example
 * ```typescript
 * import { withConnectionLock } from "@flowblade/source-duckdb";
 *
 * const conn = ds.getConnection();
 * await withConnectionLock(conn, async () => {
 *   await conn.run("CREATE TABLE product AS SELECT * FROM staging");
 *   await conn.run("DROP TABLE staging");
 * });
 * ```
 */
export const withConnectionLock = async <T>(
  connection: DuckDBConnection,
  fn: () => Promise<T>,
  options?: {
    /**
     * Stop waiting for the lock, rejects with the abort reason.
     */
    signal?: AbortSignal;
  }
): Promise<T> => {
  const lock = getConnectionLock(connection);
  const hold = getContextHold(lock);
  if (hold !== undefined) {
    const { transaction } = hold;
    if (transaction === undefined) {
      return await fn();
    }
    transaction.assertActive();
    // tracked: the transaction never ends before it, even when not awaited
    return await transaction.trackQuery(
      (async () => {
        try {
          return await fn();
        } catch (error) {
          transaction.onQueryFailed(error);
          throw error;
        }
      })()
    );
  }
  const release = await lock.acquireShared(options?.signal);
  const newHold: ConnectionHold = { lock, released: false };
  try {
    return await runWithHold(newHold, fn);
  } finally {
    newHold.released = true;
    release();
  }
};

/**
 * Whether the current async context runs in a `DuckdbDatasource` transaction
 * callback on this connection: its queries run in the transaction (ie: skip
 * a CHECKPOINT, DuckDB can't checkpoint in a transaction).
 *
 * @example
 * ```typescript
 * import { isInConnectionTransaction } from "@flowblade/source-duckdb";
 *
 * if (!isInConnectionTransaction(conn)) {
 *   await conn.run("CHECKPOINT");
 * }
 * ```
 */
export const isInConnectionTransaction = (
  connection: DuckDBConnection
): boolean =>
  getContextHold(getConnectionLock(connection))?.transaction !== undefined;

import type { DuckDBConnection } from "@duckdb/node-api";

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
    let head = this.#queue[0];
    while (head !== undefined && this.#canGrant(head.exclusive)) {
      this.#queue.shift();
      head.grant();
      head = this.#queue[0];
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
    return await new Promise<ReleaseLock>((resolve, reject) => {
      const onAbort = () => {
        const idx = this.#queue.indexOf(waiter);
        if (idx !== -1) {
          this.#queue.splice(idx, 1);
          // the removed waiter might have blocked the next ones
          this.#drain();
        }
        reject(signal?.reason);
      };
      const waiter: Waiter = {
        exclusive,
        grant: () => {
          signal?.removeEventListener("abort", onAbort);
          resolve(this.#take(exclusive));
        },
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#queue.push(waiter);
    });
  }
}

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

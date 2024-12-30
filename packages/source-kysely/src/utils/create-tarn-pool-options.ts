const THIRTY_SECONDS_IN_MS = 30_000;

export type TarnPoolOptions = {
  /** Minimum number of connections, default 0 */
  min?: number;
  /** Maximum number of connections, default 10 */
  max?: number;

  /**
   * The maximum number of milliseconds to wait for a connection to become available when the pool is exhausted.
   * default: 30_000 (30 seconds)
   */
  acquireTimeoutMillis?: number;
  /**
   * The maximum number of milliseconds to wait for a connection to be created.
   * default: 30_000 (30 seconds)
   */
  createTimeoutMillis?: number;
  /**
   * The maximum number of milliseconds a connection can go unused before it is closed.
   * default: 5_000 (5 seconds)
   */
  destroyTimeoutMillis?: number;
  /**
   * The maximum number of milliseconds that a connection can remain idle in the pool before being closed.
   * default: 30_000 (30 seconds)
   */
  idleTimeoutMillis?: number;
  /**
   * The frequency to check for idle connections.
   * default: 1_000 (1 second)
   */
  reapIntervalMillis?: number;
  /**
   * How long to idle after failed create before trying again
   * default: 200
   */
  createRetryIntervalMillis?: number;
  /**
   * Whether to propagate errors that occur during connection creation.
   * default: false
   */
  propagateCreateError?: boolean;
};

const defaultPoolOptions = {
  min: 0,
  max: 10,
  acquireTimeoutMillis: THIRTY_SECONDS_IN_MS,
  createTimeoutMillis: THIRTY_SECONDS_IN_MS,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: THIRTY_SECONDS_IN_MS,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
  propagateCreateError: false,
} as const satisfies TarnPoolOptions;

export const createTarnPoolOptions = (
  tarnPoolOptions?: TarnPoolOptions
): Required<TarnPoolOptions> => {
  return {
    ...defaultPoolOptions,
    ...tarnPoolOptions,
  };
};

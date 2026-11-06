/**
 * Randomization of the backoff delay:
 * - "equal" (default): half of the delay is random, ie: 50-100ms for a
 *   100ms backoff. Spreads the concurrent retries and keeps a minimum delay.
 * - "full": the whole delay is random, ie: 0-100ms. Spreads the retries the
 *   most, but can retry at once.
 * - "none": no randomization, the concurrent retries run at the same time.
 */
export type BackoffJitter = "equal" | "full" | "none";

export type ExponentialBackoffOptions = {
  /**
   * Delay of the first retry in milliseconds (before jitter), doubled for
   * each retry.
   *
   * @default 50
   */
  initialDelayMs?: number;
  /**
   * Maximum delay in milliseconds (before jitter).
   *
   * @default 1000
   */
  maxDelayMs?: number;
  /**
   * @default "equal"
   */
  jitter?: BackoffJitter;
};

const assertDelay = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(
      `${name} must be a non-negative finite number, got ${value}`
    );
  }
};

/**
 * Create an exponential backoff retry delay function, ie: for the
 * transaction `retry.delayMs` option. The delay of the retry `n` (1 for the
 * first retry) is `min(maxDelayMs, initialDelayMs * 2 ** (n - 1))`, randomized
 * by `jitter`, rounded to the millisecond.
 *
 * The default (`createExponentialBackoff()`) is the default retry delay of
 * the transactions: 25-50ms, 50-100ms, 100-200ms... up to 500ms-1s.
 *
 * @throws {TypeError} when a delay isn't a non-negative finite number
 *
 * @example
 * ```typescript
 * import { createExponentialBackoff } from "@flowblade/core";
 *
 * const ds = new KyselyDatasource({
 *   connection: db,
 *   defaultOptions: {
 *     transaction: {
 *       retry: {
 *         maxRetries: 3,
 *         // 0-100ms, 0-200ms then 0-400ms
 *         delayMs: createExponentialBackoff({
 *           initialDelayMs: 100,
 *           maxDelayMs: 2000,
 *           jitter: "full",
 *         }),
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const createExponentialBackoff = (
  options: ExponentialBackoffOptions = {}
): ((retry: number) => number) => {
  const { initialDelayMs = 50, maxDelayMs = 1000, jitter = "equal" } = options;
  assertDelay("initialDelayMs", initialDelayMs);
  assertDelay("maxDelayMs", maxDelayMs);
  return (retry: number): number => {
    const backoff = Math.min(
      maxDelayMs,
      initialDelayMs * 2 ** Math.max(0, retry - 1)
    );
    if (jitter === "none") {
      return Math.round(backoff);
    }
    if (jitter === "full") {
      return Math.round(Math.random() * backoff);
    }
    return Math.round(backoff / 2 + Math.random() * (backoff / 2));
  };
};

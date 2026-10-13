import type { QResult } from "./q-result";

export type QError = {
  message: string;
  /**
   * The original error (ie: the driver error), useful to inspect
   * driver specific details like error codes.
   *
   * Never serialized: `QResult.toJsonifiable()` leaves it out so driver
   * internals aren't sent to clients.
   */
  cause?: unknown;
};

export type AsyncQResult<
  TData extends unknown[],
  TError extends QError | undefined = QError,
> = Promise<QResult<TData, TError>>;

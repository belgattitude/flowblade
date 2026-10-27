import type { QResult } from "./q-result";

/**
 * Error codes set by flowblade itself (driver error codes are kept in the cause).
 */
export type QErrorCode = "TOO_MANY_RESULTS";

export type QError = {
  message: string;
  /**
   * Set when the error originates from flowblade rather than the driver,
   * ie: `queryOne()` returning more than one row ("TOO_MANY_RESULTS").
   */
  code?: QErrorCode;
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
  TData,
  TError extends QError | undefined = QError,
> = Promise<QResult<TData, TError>>;

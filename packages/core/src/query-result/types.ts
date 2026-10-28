import type { QResult } from "./q-result";

/**
 * Error codes, always set on a QError (driver error codes are kept in the cause):
 * - "QUERY_FAILED": the query failed, the driver error is the cause,
 * - "ABORTED": the query was aborted with its `signal`, the abort reason is the cause,
 * - "TOO_MANY_RESULTS": `queryOne()` got more than one row, a `QErrors.TooManyResults` is the cause,
 * - "MAP_FAILED": the `QResult.map()` transform threw, the thrown error is the cause.
 */
export type QErrorCode =
  | "QUERY_FAILED"
  | "ABORTED"
  | "TOO_MANY_RESULTS"
  | "MAP_FAILED";

export type QError = {
  message: string;
  /**
   * What failed, ie: "QUERY_FAILED" or "ABORTED" (see QErrorCode), useful
   * to `switch` over the errors.
   */
  code: QErrorCode;
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

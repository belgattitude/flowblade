import type { QAbortedError } from "../errors/q-aborted-error";
import type { QRolledBackError } from "../errors/q-rolled-back-error";
import type { QTransactionConflictError } from "../errors/q-transaction-conflict-error";
import type { QTransactionDomainRollbackError } from "../errors/q-transaction-domain-rollback-error";
import type { QTransactionFailedError } from "../errors/q-transaction-failed-error";
import type { QResult } from "./q-result";

/**
 * Error codes, always set on a QError (driver error codes are kept in the cause):
 * - "QUERY_FAILED": the query failed, the driver error is the cause,
 * - "ABORTED": the query was aborted with its `signal`, the abort reason is the cause,
 * - "TOO_MANY_RESULTS": `queryOne()` got more than one row, a `QErrors.TooManyResults` is the cause,
 * - "MAP_FAILED": the `QResult.map()` transform threw, the thrown error is the cause,
 * - "ROLLED_BACK": the `transaction()` callback threw (or called `tx.rollback()`)
 *   and the transaction was rolled back, the thrown value is the cause,
 * - "DOMAIN_ROLLBACK": the callback threw a `QErrors.DomainRollback`; the
 *   transaction error includes its reason and serializable details,
 * - "TRANSACTION_FAILED": the transaction couldn't begin, commit or roll back,
 *   the driver error is the cause,
 * - "TRANSACTION_CONFLICT": the transaction conflicts with a concurrent one
 *   (ie: serialization failure, deadlock), transient: can be retried.
 */
export type QErrorCode =
  | "QUERY_FAILED"
  | "ABORTED"
  | "TOO_MANY_RESULTS"
  | "MAP_FAILED"
  | "ROLLED_BACK"
  | "DOMAIN_ROLLBACK"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_CONFLICT";

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

type QErrorWithCode<TCode extends QErrorCode> = Omit<QError, "code"> & {
  code: TCode;
};

/**
 * An aborted query result. `cause` is the signal's reason, which can be any
 * JavaScript value.
 */
export type AbortedQError = QErrorWithCode<"ABORTED">;

/** Errors returned by `query()`. */
export type QueryQError = QErrorWithCode<"QUERY_FAILED"> | AbortedQError;

/** A `queryOne()` result contains more than one row. */
export type TooManyResultsQError = QErrorWithCode<"TOO_MANY_RESULTS">;

/** Errors returned by `queryOne()`, including the multiple-row case. */
export type QueryOneQError = QueryQError | TooManyResultsQError;

/** Error added by `QResult.map()` when its mapper throws. */
export type MapFailedQError = QErrorWithCode<"MAP_FAILED">;

/**
 * Errors returned by `transaction()`. The code discriminates the available
 * fields; `DOMAIN_ROLLBACK` requires `reason` and `details`, while `cause` is
 * runtime-only.
 */
export type TransactionQError =
  | QRolledBackError
  | QTransactionDomainRollbackError
  | QTransactionFailedError
  | QTransactionConflictError
  | QAbortedError;

export type AsyncQResult<
  TData,
  TError extends QError | undefined = QError,
> = Promise<QResult<TData, TError>>;

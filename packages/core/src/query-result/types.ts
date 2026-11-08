import type { QDomainRollbackError } from "../errors/q-domain-rollback-error";
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

/**
 * Errors returned by `transaction()`. The code discriminates the available
 * fields; `DOMAIN_ROLLBACK` requires `reason` and `details`, while `cause` is
 * runtime-only.
 */
export type TransactionQError =
  | (QError & { code: "ROLLED_BACK" })
  | (QError & {
      code: "DOMAIN_ROLLBACK";
      reason: string;
      details: unknown;
      cause?: QDomainRollbackError;
    })
  | (QError & { code: "TRANSACTION_FAILED" })
  | (QError & { code: "TRANSACTION_CONFLICT" })
  | (QError & { code: "ABORTED" });

export type AsyncQResult<
  TData,
  TError extends QError | undefined = QError,
> = Promise<QResult<TData, TError>>;

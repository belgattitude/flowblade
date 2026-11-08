import type { QMeta } from "../meta/q-meta";
import type { QError } from "../query-result/types";
import { isError } from "../utils/brand";
import { QAbortedError } from "./q-aborted-error";
import { QDomainRollbackError } from "./q-domain-rollback-error";
import type { QGetOrThrowErrorFactories } from "./q-error-factories";
import { QQueryFailedError } from "./q-query-failed-error";
import { QRolledBackError } from "./q-rolled-back-error";
import { QTooManyResultsError } from "./q-too-many-results-error";
import { QTransactionConflictError } from "./q-transaction-conflict-error";
import { QTransactionFailedError } from "./q-transaction-failed-error";

/**
 * Convert a QError into the default error to throw:
 * - "QUERY_FAILED": a `QErrors.QueryFailed`, the driver error as cause,
 * - "ABORTED": a `QErrors.Aborted`, the abort reason as cause,
 * - "TOO_MANY_RESULTS": the `QErrors.TooManyResults` cause,
 * - "ROLLED_BACK": the error thrown by the transaction callback (the cause,
 *   ie: a `QErrors.RolledBack` from `tx.rollback()`), or a `QErrors.RolledBack`
 *   with the cause when the callback threw a non Error value,
 * - "DOMAIN_ROLLBACK": the `QErrors.DomainRollback` thrown by the callback,
 * - "TRANSACTION_FAILED": a `QErrors.TransactionFailed`, the driver error as cause,
 * - "TRANSACTION_CONFLICT": a `QErrors.TransactionConflict`, with the cause,
 * - otherwise (ie: "MAP_FAILED"): an Error with the QError cause.
 */
const toDefaultException = (qError: QError): Error => {
  const { message, code, cause } = qError;
  if (code === "QUERY_FAILED") {
    return new QQueryFailedError(message, { cause });
  }
  if (code === "ABORTED") {
    return new QAbortedError(message, { cause });
  }
  if (code === "TOO_MANY_RESULTS" && cause instanceof QTooManyResultsError) {
    return cause;
  }
  if (code === "ROLLED_BACK") {
    // rethrow what the transaction callback threw, as is
    return isError(cause) ? cause : new QRolledBackError(message, { cause });
  }
  if (code === "DOMAIN_ROLLBACK") {
    return cause instanceof QDomainRollbackError
      ? cause
      : new QDomainRollbackError(
          "reason" in qError && typeof qError.reason === "string"
            ? qError.reason
            : message,
          "details" in qError ? qError.details : undefined
        );
  }
  if (code === "TRANSACTION_FAILED") {
    return new QTransactionFailedError(message, { cause });
  }
  if (code === "TRANSACTION_CONFLICT") {
    return new QTransactionConflictError(message, { cause });
  }
  // "MAP_FAILED", or a QError built without a known code at runtime
  return new Error(message, { cause });
};

/**
 * Convert a QError into the error to throw, used by `QResult.getOrThrow()`
 * and the datasources throwing methods: the `onTooManyResults` factory error
 * for more than one row, the `onError` factory error for the other failures,
 * or the default error (ie: `QErrors.QueryFailed`) without factory.
 *
 * @internal
 */
export const qErrorToException = (
  qError: QError,
  meta: QMeta,
  factories?: QGetOrThrowErrorFactories
): Error => {
  const error = toDefaultException(qError);
  const { onError, onTooManyResults } = factories ?? {};
  // a TooManyResults thrown by a transaction callback ("ROLLED_BACK") goes to onError
  if (
    qError.code === "TOO_MANY_RESULTS" &&
    error instanceof QTooManyResultsError
  ) {
    return (
      onTooManyResults?.({ error, rowCount: error.rowCount, meta }) ?? error
    );
  }
  return onError?.({ error, qError, meta }) ?? error;
};

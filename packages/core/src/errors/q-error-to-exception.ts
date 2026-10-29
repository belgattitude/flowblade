import type { QMeta } from "../meta/q-meta";
import type { QError } from "../query-result/types";
import { QAbortedError } from "./q-aborted-error";
import type { QGetOrThrowErrorFactories } from "./q-error-factories";
import { QQueryFailedError } from "./q-query-failed-error";
import { QTooManyResultsError } from "./q-too-many-results-error";

/**
 * Convert a QError into the default error to throw:
 * - "QUERY_FAILED": a `QErrors.QueryFailed`, the driver error as cause,
 * - "ABORTED": a `QErrors.Aborted`, the abort reason as cause,
 * - "TOO_MANY_RESULTS": the `QErrors.TooManyResults` cause,
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
  if (error instanceof QTooManyResultsError) {
    return (
      onTooManyResults?.({ error, rowCount: error.rowCount, meta }) ?? error
    );
  }
  return onError?.({ error, qError, meta }) ?? error;
};

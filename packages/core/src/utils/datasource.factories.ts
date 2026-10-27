import { QNoResultError } from "../errors/q-no-result-error";
import type {
  QOneRowErrorFactories,
  QOneRowNoResultOptions,
} from "../errors/q-one-row-error-factories";
import { QTooManyResultsError } from "../errors/q-too-many-results-error";
import type { QMeta, QMetaSqlSpan } from "../meta/q-meta";
import { QResult } from "../query-result/q-result";
import type { QError } from "../query-result/types";

/**
 * Create a new SQL span with sql query + params and initial timeMs: 0, affectedRows: 0.
 */
export const createSqlSpan = ({
  sql,
  params,
  timeMs,
  affectedRows,
}: {
  sql: QMetaSqlSpan["sql"];
  params: QMetaSqlSpan["params"];
  timeMs?: number;
  affectedRows?: number;
}): QMetaSqlSpan => {
  return {
    type: "sql",
    sql,
    params,
    timeMs: timeMs ?? 0,
    affectedRows: affectedRows ?? 0,
  };
};

export const createQResultSuccess = <T extends unknown[]>(
  data: T,
  meta: QMeta
): QResult<T, never> =>
  new QResult({
    meta,
    data,
  });

export const createQResultError = (
  error: QError,
  meta: QMeta
): QResult<never, QError> =>
  new QResult({
    meta,
    error,
  });

/**
 * Convert a query result into a single row result, used to implement `queryOne()`.
 *
 * Succeeds with the row when the result contains exactly one row, or with
 * null when it contains none. More than one row returns an error with code
 * "TOO_MANY_RESULTS" and a `QErrors.TooManyResults` as cause.
 * Failed results are returned as is.
 */
export const toOneRowQResult = <TData extends unknown[]>(
  result: QResult<TData, QError>
): QResult<TData[number] | null, QError> => {
  const { data, error, meta } = result;
  if (error !== undefined) {
    return new QResult({ meta, error, shape: "one" });
  }
  // Narrowing doesn't remove undefined from a generic TData
  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  const rows = data as TData;
  if (rows.length <= 1) {
    return new QResult({
      meta,
      data: (rows[0] as TData[number] | undefined) ?? null,
      shape: "one",
    });
  }
  const tooManyError = new QTooManyResultsError(rows.length);
  return new QResult({
    meta,
    error: {
      message: tooManyError.message,
      code: tooManyError.code,
      cause: tooManyError,
    },
    shape: "one",
  });
};

/**
 * Return the row of a `queryOne()` result or throw, used to implement
 * `queryOneOrThrow()`.
 *
 * When there's no row, returns `defaultValue` if set in the options, otherwise
 * throws the `onNoResult` factory error or a `QErrors.NoResult`. Throws the
 * `onTooManyResults` factory error or a `QErrors.TooManyResults` when there's
 * more than one and, for query failures, an Error prefixed with
 * "Query failed: " holding the driver error as cause.
 *
 * Error factories set in the options win over the defaults (ie: datasource
 * `errors` param).
 */
export const getOneRowOrThrow = <TRow, TDefault = never>(
  result: QResult<TRow | null, QError>,
  options?: Pick<QOneRowErrorFactories, "onTooManyResults"> &
    QOneRowNoResultOptions<TDefault>,
  defaults?: QOneRowErrorFactories
): TRow | TDefault => {
  const { meta } = result;
  const factories = [options, defaults];
  const row = result.getOrThrow((qErr) => {
    const { cause } = qErr;
    if (cause instanceof QTooManyResultsError) {
      const factory = factories.find(
        (f) => f?.onTooManyResults
      )?.onTooManyResults;
      return (
        factory?.({ error: cause, rowCount: cause.rowCount, meta }) ?? cause
      );
    }
    return new Error(`Query failed: ${qErr.message}`, { cause });
  });
  if (row === null) {
    if (options !== undefined && "defaultValue" in options) {
      return options.defaultValue as TDefault;
    }
    const error = new QNoResultError();
    const factory = factories.find((f) => f?.onNoResult)?.onNoResult;
    throw factory?.({ error, meta }) ?? error;
  }
  return row;
};

import type {
  QGetOrThrowErrorFactories,
  QOneRowErrorFactories,
  QOneRowNoResultOptions,
} from "../errors/q-error-factories";
import { qErrorToException } from "../errors/q-error-to-exception";
import { QNoResultError } from "../errors/q-no-result-error";
import { QTooManyResultsError } from "../errors/q-too-many-results-error";
import type { QMeta, QMetaSqlSpan } from "../meta/q-meta";
import { QResult } from "../query-result/q-result";
import type { QError, TooManyResultsQError } from "../query-result/types";

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

export const createQResultError = <TError extends QError>(
  error: TError,
  meta: QMeta
): QResult<never, TError> =>
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
export const toOneRowQResult = <TData extends unknown[], TError extends QError>(
  result: QResult<TData, TError>
): QResult<TData[number] | null, TError | TooManyResultsQError> => {
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
  }) as QResult<TData[number] | null, TError | TooManyResultsQError>;
};

/**
 * Return the data of a result or throw, used to implement `queryOrThrow()`.
 *
 * On failure, throws the `onTooManyResults` factory error for more than one
 * row, the `onError` factory error for the other failures, or the default
 * error (ie: `QErrors.QueryFailed`, `QErrors.Aborted`) without factory.
 *
 * @example
 * ```typescript
 * const result = await this.query(query, options);
 * return {
 *   data: getDataOrThrow(result, {
 *     onError: options?.onError ?? this.defaultOptions.queryOrThrow?.onError,
 *   }),
 *   meta: result.meta,
 * };
 * ```
 */
export const getDataOrThrow = <TData>(
  result: QResult<TData, QError | undefined>,
  factories?: QGetOrThrowErrorFactories
): TData => {
  if (result.error !== undefined) {
    throw qErrorToException(result.error, result.meta, factories);
  }
  return result.data;
};

/**
 * Return the row of a `queryOne()` result or throw, used to implement
 * `queryOneOrThrow()`.
 *
 * When there's no row, returns `defaultValue` if set in the options, otherwise
 * throws the `onNoResult` factory error or a `QErrors.NoResult`. Throws the
 * `onTooManyResults` factory error or a `QErrors.TooManyResults` when there's
 * more than one and, like `getDataOrThrow()`, the `onError` factory error
 * or a `QErrors.QueryFailed` / `QErrors.Aborted` when the query failed.
 *
 * Error factories set in the options win over the defaults (ie: datasource
 * `defaultOptions.queryOneOrThrow` param).
 */
export const getOneRowOrThrow = <TRow, TDefault = never>(
  result: QResult<TRow | null, QError>,
  options?: Pick<QOneRowErrorFactories, "onError" | "onTooManyResults"> &
    QOneRowNoResultOptions<TDefault>,
  defaults?: QOneRowErrorFactories
): TRow | TDefault => {
  const row = getDataOrThrow(result, {
    onError: options?.onError ?? defaults?.onError,
    onTooManyResults: options?.onTooManyResults ?? defaults?.onTooManyResults,
  });
  if (row === null) {
    if (options !== undefined && "defaultValue" in options) {
      return options.defaultValue as TDefault;
    }
    const error = new QNoResultError();
    const onNoResult = options?.onNoResult ?? defaults?.onNoResult;
    throw onNoResult?.({ error, meta: result.meta }) ?? error;
  }
  return row;
};

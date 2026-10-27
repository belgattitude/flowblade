import type { QMeta } from "../meta/q-meta";
import type { QNoResultError } from "./q-no-result-error";
import type { QTooManyResultsError } from "./q-too-many-results-error";

/**
 * Create the error thrown when a query expecting one row returns none.
 */
export type QNoResultErrorFactory = (context: {
  /**
   * The default error, useful as `cause`
   */
  error: QNoResultError;
  meta: QMeta;
}) => Error;

/**
 * Create the error thrown when a query expecting one row returns more.
 */
export type QTooManyResultsErrorFactory = (context: {
  /**
   * The default error, useful as `cause`
   */
  error: QTooManyResultsError;
  /**
   * Number of rows returned by the query
   */
  rowCount: number;
  meta: QMeta;
}) => Error;

/**
 * Replace the errors thrown by `queryOneOrThrow()`,
 * ie: to throw your own (http) errors rather than `QErrors.NoResult` and
 * `QErrors.TooManyResults`.
 *
 * Can be set as datasource defaults (`errors` param) and overridden per query.
 *
 * @example
 * ```typescript
 * import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
 *
 * const factories: QOneRowErrorFactories = {
 *   onNoResult: ({ error }) =>
 *     new HttpNotFound({ message: "Resource not found", cause: error }),
 *   onTooManyResults: ({ error, rowCount }) =>
 *     new HttpInternalServerError({
 *       message: `Expected one row, got ${rowCount}`,
 *       cause: error,
 *     }),
 * };
 * ```
 */
export type QOneRowErrorFactories = {
  onNoResult?: QNoResultErrorFactory;
  onTooManyResults?: QTooManyResultsErrorFactory;
};

/**
 * What `queryOneOrThrow()` does when the query returns no row, either:
 * - throw a `QErrors.NoResult`, or the `onNoResult` factory error
 * - return `defaultValue` (ie: default settings), mutually exclusive with `onNoResult`
 *
 * @example
 * ```typescript
 * const { data: settings } = await ds.queryOneOrThrow(query, {
 *   defaultValue: { theme: "light" },
 * });
 * ```
 */
export type QOneRowNoResultOptions<TDefault = never> =
  | {
      onNoResult?: QNoResultErrorFactory;
      defaultValue?: never;
    }
  | {
      /**
       * Value returned when the query returns no row, rather than throwing.
       * Query failures and more than one row still throw.
       */
      defaultValue: TDefault;
      onNoResult?: never;
    };

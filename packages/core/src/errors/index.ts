/**
 * Errors thrown by flowblade, exported as the `QErrors` namespace:
 * - `QErrors.QueryFailed`: the query failed (500),
 * - `QErrors.Aborted`: the query was aborted (504 on timeout, 499 otherwise),
 * - `QErrors.NoResult`: `queryOneOrThrow()` got no row (404),
 * - `QErrors.TooManyResults`: `queryOne()` / `queryOneOrThrow()` got more than one row (500).
 *
 * @example
 * ```typescript
 * import { QErrors } from "@flowblade/core";
 *
 * try {
 *   const { data: product } = await ds.queryOneOrThrow(query);
 * } catch (e) {
 *   if (e instanceof QErrors.NoResult) {
 *     // not found, ie: return a 404
 *   }
 *   throw e;
 * }
 * ```
 *
 * @module
 */
export { QAbortedError as Aborted } from "./q-aborted-error";
export { QNoResultError as NoResult } from "./q-no-result-error";
export { QQueryFailedError as QueryFailed } from "./q-query-failed-error";
export { QTooManyResultsError as TooManyResults } from "./q-too-many-results-error";

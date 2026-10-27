/**
 * Errors thrown by flowblade, exported as the `QErrors` namespace.
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
export { QNoResultError as NoResult } from "./q-no-result-error";
export { QTooManyResultsError as TooManyResults } from "./q-too-many-results-error";

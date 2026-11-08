/**
 * Errors thrown by flowblade, exported as the `QErrors` namespace:
 * - `QErrors.QueryFailed`: the query failed (500),
 * - `QErrors.Aborted`: the query was aborted (504 on timeout, 499 otherwise),
 * - `QErrors.NoResult`: `queryOneOrThrow()` got no row (404),
 * - `QErrors.TooManyResults`: `queryOne()` / `queryOneOrThrow()` got more than one row (500),
 * - `QErrors.RolledBack`: a transaction was rolled back with `tx.rollback()` (500),
 * - `QErrors.DomainRollback`: an expected domain rejection rolled back a transaction,
 * - `QErrors.TransactionDomainRollback`: a domain rollback returned by `transaction()`,
 * - `QErrors.TransactionFailed`: a transaction couldn't begin, commit or roll back (500),
 * - `QErrors.TransactionConflict`: a transaction conflicts with a concurrent one (409).
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
export {
  QDomainRollbackError as DomainRollback,
  type QDomainRollbackOptions,
} from "./q-domain-rollback-error";
export { QNoResultError as NoResult } from "./q-no-result-error";
export { QQueryFailedError as QueryFailed } from "./q-query-failed-error";
export { QRolledBackError as RolledBack } from "./q-rolled-back-error";
export { QTooManyResultsError as TooManyResults } from "./q-too-many-results-error";
export { QTransactionConflictError as TransactionConflict } from "./q-transaction-conflict-error";
export {
  QTransactionDomainRollbackError as TransactionDomainRollback,
  type QTransactionDomainRollbackOptions,
} from "./q-transaction-domain-rollback-error";
export { QTransactionFailedError as TransactionFailed } from "./q-transaction-failed-error";

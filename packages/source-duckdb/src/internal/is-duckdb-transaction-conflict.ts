/**
 * Whether a DuckDB error is a conflict with a concurrent transaction (of
 * another connection), ie: "TransactionContext Error: Conflict on update!",
 * "Catalog write-write conflict on create...", "Transaction conflict:
 * attempting to update table...".
 *
 * @internal
 */
export const isDuckdbTransactionConflict = (error: unknown): boolean =>
  error instanceof Error &&
  /^TransactionContext Error:.*conflict/is.test(error.message);

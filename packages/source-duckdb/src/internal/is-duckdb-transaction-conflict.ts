const conflictPattern =
  /^TransactionContext Error: (?:Failed to commit: )?(?:Conflict on (?:update|tuple deletion)|Catalog write-write conflict on |Transaction conflict: )/i;

/**
 * Whether a DuckDB error is a conflict with a concurrent transaction (of
 * another connection), ie: "TransactionContext Error: Conflict on update!",
 * "Catalog write-write conflict on create...", "Transaction conflict:
 * attempting to update table...".
 *
 * Only these known phrases are matched: the messages hold user data (ie: a
 * duplicate key value or a table name containing "conflict").
 *
 * @internal
 */
export const isDuckdbTransactionConflict = (error: unknown): boolean =>
  error instanceof Error && conflictPattern.test(error.message);

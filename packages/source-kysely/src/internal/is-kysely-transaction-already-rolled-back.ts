/**
 * SQL Server error raised when rollback is attempted without an active
 * transaction (for example, after a trigger already rolled it back).
 */
export const isKyselyTransactionAlreadyRolledBack = (
  error: unknown
): boolean => {
  if (Array.isArray(error)) {
    return error.some(isKyselyTransactionAlreadyRolledBack);
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "number" in error &&
    error.number === 3903
  );
};

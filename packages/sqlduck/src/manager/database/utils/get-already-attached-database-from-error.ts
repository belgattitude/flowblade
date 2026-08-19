type Result =
  | {
      isAlreadyAttached: false;
    }
  | {
      isAlreadyAttached: true;
      dbAlias: string;
    };

/**
 * Return the database name that is already attached to the error message
 *
 * Note duckdb might complain about already attached databases with a message like
 * Binder Error: Unique file handle conflict: Cannot attach "duckdb_second_attached_file" - the database file "/home/sebastien/github/flowblade/packages/sqlduck/tests/tmp/duckdb_test_reattachable_file.db" is already attached by database "duckdb_first_attached_file"
 */
export const getAlreadyAttachedDatabaseFromError = (error: unknown): Result => {
  if (!(error instanceof Error)) {
    return {
      isAlreadyAttached: false,
    };
  }
  const regex =
    /Binder Error:.*Cannot attach.*already attached by database\s+['"“]?\b(?<dbAlias>[\w$]+)\b['"”]?/is;
  const match = regex.exec(error.message);
  const dbAlias = match?.groups?.dbAlias ?? null;
  if (dbAlias === null || dbAlias.trim() === "") {
    return {
      isAlreadyAttached: false,
    };
  }
  return { isAlreadyAttached: true, dbAlias };
};

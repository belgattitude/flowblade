import { describe, expect, it } from "vitest";

import { getAlreadyAttachedDatabaseFromError } from "./get-already-attached-database-from-error.ts";

describe("getAlreadyAttachedDatabaseFromError", () => {
  it("should extract the database alias with double quotes", () => {
    const errorMessage =
      'Binder Error: Unique file handle conflict: Cannot attach "db2" - the database file "/path/to/file.db" is already attached by database "db1"';
    const error = new Error(errorMessage);

    const result = getAlreadyAttachedDatabaseFromError(error);

    expect(result).toEqual({ isAlreadyAttached: true, dbAlias: "db1" });
  });

  it("should extract the database alias with single quotes", () => {
    const errorMessage =
      "Binder Error: Unique file handle conflict: Cannot attach 'db2' - the database file '/path/to/file.db' is already attached by database 'db1'";
    const error = new Error(errorMessage);

    const result = getAlreadyAttachedDatabaseFromError(error);

    expect(result).toEqual({ isAlreadyAttached: true, dbAlias: "db1" });
  });

  it("should extract the database alias with smart quotes", () => {
    const errorMessage =
      "Binder Error: Unique file handle conflict: Cannot attach “db2” - the database file “/path/to/file.db” is already attached by database “db1”";
    const error = new Error(errorMessage);

    const result = getAlreadyAttachedDatabaseFromError(error);

    expect(result).toEqual({ isAlreadyAttached: true, dbAlias: "db1" });
  });

  it("should extract the database alias without quotes", () => {
    const errorMessage =
      "Binder Error: Unique file handle conflict: Cannot attach db2 - the database file /path/to/file.db is already attached by database db1";
    const error = new Error(errorMessage);

    const result = getAlreadyAttachedDatabaseFromError(error);

    expect(result).toEqual({ isAlreadyAttached: true, dbAlias: "db1" });
  });

  it("should extract database alias containing $ or underscores", () => {
    const errorMessage =
      'Binder Error: Cannot attach something - already attached by database "my_db$123"';
    const error = new Error(errorMessage);

    const result = getAlreadyAttachedDatabaseFromError(error);

    expect(result).toEqual({ isAlreadyAttached: true, dbAlias: "my_db$123" });
  });

  it("should handle non-Error objects", () => {
    const result = getAlreadyAttachedDatabaseFromError("just a string");
    expect(result).toEqual({ isAlreadyAttached: false });
  });

  it("should handle null/undefined", () => {
    expect(getAlreadyAttachedDatabaseFromError(null)).toEqual({
      isAlreadyAttached: false,
    });
    expect(getAlreadyAttachedDatabaseFromError(undefined)).toEqual({
      isAlreadyAttached: false,
    });
  });

  it("should return false for unrelated errors", () => {
    const error = new Error('Binder Error: Table "users" does not exist');
    const result = getAlreadyAttachedDatabaseFromError(error);
    expect(result).toEqual({ isAlreadyAttached: false });
  });

  it("should match the example message from comments", () => {
    const msg =
      'Binder Error: Unique file handle conflict: Cannot attach "duckdb_second_attached_file" - the database file "/home/sebastien/github/flowblade/packages/sqlduck/tests/tmp/duckdb_test_reattachable_file.db" is already attached by database "duckdb_first_attached_file"';
    const result = getAlreadyAttachedDatabaseFromError(new Error(msg));
    expect(result).toEqual({
      isAlreadyAttached: true,
      dbAlias: "duckdb_first_attached_file",
    });
  });
});

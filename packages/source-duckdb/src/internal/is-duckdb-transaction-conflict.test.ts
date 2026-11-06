import { describe, expect, it } from "vitest";

import { isDuckdbTransactionConflict } from "./is-duckdb-transaction-conflict.ts";

describe(isDuckdbTransactionConflict, () => {
  it.each([
    "TransactionContext Error: Conflict on update!",
    "TransactionContext Error: Conflict on tuple deletion!",
    'TransactionContext Error: Catalog write-write conflict on create with ""Schema\\0main\\0Table\\0main\\0x""',
    'TransactionContext Error: Transaction conflict: attempting to update table ""t"" but it has been altered by a different transaction',
  ])("should recognize %s", (message) => {
    expect(isDuckdbTransactionConflict(new Error(message))).toBe(true);
  });

  it.each([
    'TransactionContext Error: Failed to commit: PRIMARY KEY or UNIQUE constraint violation: duplicate key "2"',
    "TransactionContext Error: Current transaction is aborted (please ROLLBACK)",
    "Constraint Error: conflict in the name only",
    'TransactionContext Error: Failed to commit: PRIMARY KEY or UNIQUE constraint violation: duplicate key "conflict_1"',
    'TransactionContext Error: Failed to commit: table "write_conflict" has a constraint violation',
  ])("should not recognize %s", (message) => {
    expect(isDuckdbTransactionConflict(new Error(message))).toBe(false);
  });

  it("should not recognize non errors", () => {
    expect(isDuckdbTransactionConflict("Conflict on update!")).toBe(false);
  });
});

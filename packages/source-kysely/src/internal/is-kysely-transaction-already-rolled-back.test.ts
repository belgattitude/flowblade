import { describe, expect, it } from "vitest";

import { isKyselyTransactionAlreadyRolledBack } from "./is-kysely-transaction-already-rolled-back.ts";

describe(isKyselyTransactionAlreadyRolledBack, () => {
  it("recognizes SQL Server's no-active-transaction rollback error", () => {
    expect(
      isKyselyTransactionAlreadyRolledBack(
        Object.assign(new Error("No corresponding BEGIN TRANSACTION"), {
          number: 3903,
        })
      )
    ).toBe(true);
  });

  it("recognizes the error in a Kysely array of driver errors", () => {
    expect(
      isKyselyTransactionAlreadyRolledBack([
        new Error("another driver error"),
        Object.assign(new Error("No corresponding BEGIN TRANSACTION"), {
          number: 3903,
        }),
      ])
    ).toBe(true);
  });

  it.each([
    [
      "another SQL Server error",
      Object.assign(new Error("failed"), { number: 1205 }),
    ],
    ["an error with a matching code instead of number", { code: 3903 }],
    ["a non-error value", "3903"],
    ["no error", null],
  ])("does not suppress %s", (_description, error) => {
    expect(isKyselyTransactionAlreadyRolledBack(error)).toBe(false);
  });
});

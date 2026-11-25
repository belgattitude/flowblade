import { describe, expect, it } from "vitest";

import { isKnexTransactionConflict } from "./is-knex-transaction-conflict.ts";

describe(isKnexTransactionConflict, () => {
  it.each([
    ["postgres serialization failure", { code: "40001" }],
    ["postgres deadlock", { code: "40P01" }],
    ["mysql deadlock", { errno: 1213, code: "ER_LOCK_DEADLOCK" }],
    ["sql state serialization failure", { sqlState: "40001" }],
    ["sql server deadlock", { number: 1205 }],
    ["sql server snapshot conflict", { number: 3960 }],
  ])("should recognize a %s", (_name, props) => {
    expect(
      isKnexTransactionConflict(Object.assign(new Error("x"), props))
    ).toBe(true);
  });

  it.each([
    ["postgres unique violation", { code: "23505" }],
    ["mysql lock wait timeout", { errno: 1205 }],
    ["sql server syntax error", { number: 156 }],
    ["error without code", {}],
  ])("should not recognize a %s", (_name, props) => {
    expect(
      isKnexTransactionConflict(Object.assign(new Error("x"), props))
    ).toBe(false);
  });

  it("should not recognize non objects", () => {
    expect(isKnexTransactionConflict("40001")).toBe(false);
    expect(isKnexTransactionConflict(null)).toBe(false);
    expect(isKnexTransactionConflict(undefined)).toBe(false);
  });
});

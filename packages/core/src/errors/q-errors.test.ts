import { describe, expect, expectTypeOf, it } from "vitest";

import { QErrors } from "../index";
import { QAbortedError } from "./q-aborted-error";
import { QNoResultError } from "./q-no-result-error";
import { QQueryFailedError } from "./q-query-failed-error";
import { QRolledBackError } from "./q-rolled-back-error";
import { QTooManyResultsError } from "./q-too-many-results-error";
import { QTransactionDomainRollbackError } from "./q-transaction-domain-rollback-error";
import { QTransactionFailedError } from "./q-transaction-failed-error";

describe("QErrors", () => {
  it("should expose the error classes", () => {
    expect(QErrors.NoResult).toBe(QNoResultError);
    expect(QErrors.TooManyResults).toBe(QTooManyResultsError);
    expect(QErrors.QueryFailed).toBe(QQueryFailedError);
    expect(QErrors.Aborted).toBe(QAbortedError);
    expect(new QErrors.DomainRollback("OUT_OF_STOCK")).toMatchObject({
      name: "QDomainRollbackError",
      code: "DOMAIN_ROLLBACK",
      reason: "OUT_OF_STOCK",
    });
    expect(QErrors.RolledBack).toBe(QRolledBackError);
    expect(QErrors.TransactionFailed).toBe(QTransactionFailedError);
    expect(QErrors.TransactionDomainRollback).toBe(
      QTransactionDomainRollbackError
    );
    expect(new QErrors.TransactionConflict("deadlock")).toMatchObject({
      name: "QTransactionConflictError",
      code: "TRANSACTION_CONFLICT",
      message: "Transaction conflict: deadlock",
      statusCode: 409,
    });
    expect(Object.keys(QErrors).toSorted()).toStrictEqual([
      "Aborted",
      "DomainRollback",
      "NoResult",
      "QueryFailed",
      "RolledBack",
      "TooManyResults",
      "TransactionConflict",
      "TransactionDomainRollback",
      "TransactionFailed",
    ]);
  });

  it("should work with instanceof and narrow the type", () => {
    const error: unknown = new QErrors.TooManyResults(3);
    expect(error).toBeInstanceOf(QErrors.TooManyResults);
    expect(error).not.toBeInstanceOf(QErrors.NoResult);
    if (error instanceof QErrors.TooManyResults) {
      expectTypeOf(error.rowCount).toEqualTypeOf<number>();
    }
  });

  it("should carry a reason and serializable domain details", () => {
    const cause = new Error("domain validation failed");
    const error = new QErrors.DomainRollback("OUT_OF_STOCK", {
      details: { productId: 7 },
      cause,
    });
    expect(error).toBeInstanceOf(QErrors.DomainRollback);
    expect(error.reason).toBe("OUT_OF_STOCK");
    expectTypeOf(error.reason).toEqualTypeOf<string>();
    expect(error.details).toStrictEqual({ productId: 7 });
    expect(error.cause).toBe(cause);
  });

  it("should identify transaction domain rollback result errors", () => {
    const cause = new QErrors.DomainRollback("OUT_OF_STOCK", {
      details: { productId: 7 },
    });
    const error = new QErrors.TransactionDomainRollback("OUT_OF_STOCK", {
      details: { productId: 7 },
      cause,
    });

    expect(error).toBeInstanceOf(QErrors.TransactionDomainRollback);
    expect(error).toBeInstanceOf(QErrors.DomainRollback);
    expect(error).toMatchObject({
      code: "DOMAIN_ROLLBACK",
      reason: "OUT_OF_STOCK",
      details: { productId: 7 },
      cause,
    });
    expectTypeOf(error.cause).toEqualTypeOf<
      QErrors.DomainRollback | undefined
    >();
  });

  it("should be usable as types", () => {
    const getRowCount = (e: QErrors.TooManyResults) => e.rowCount;
    expect(getRowCount(new QErrors.TooManyResults(2))).toBe(2);
    expectTypeOf<QErrors.NoResult>().toEqualTypeOf<QNoResultError>();
  });

  it("should keep the error names and codes", () => {
    const cause = new Error("not found in cache");
    expect(new QErrors.NoResult({ cause })).toMatchObject({
      name: "QNoResultError",
      code: "NO_RESULT",
      cause,
    });
    expect(new QErrors.TooManyResults(2, { cause })).toMatchObject({
      name: "QTooManyResultsError",
      code: "TOO_MANY_RESULTS",
      rowCount: 2,
      cause,
    });
  });

  it("should keep the query failed and aborted names, codes and causes", () => {
    const cause = new Error("driver error");
    expect(new QErrors.QueryFailed("driver error", { cause })).toMatchObject({
      name: "QQueryFailedError",
      code: "QUERY_FAILED",
      message: "Query failed: driver error",
      cause,
    });
    const reason = new DOMException("aborted", "AbortError");
    expect(new QErrors.Aborted("aborted", { cause: reason })).toMatchObject({
      name: "QAbortedError",
      code: "ABORTED",
      message: "Query aborted: aborted",
      cause: reason,
    });
  });

  it("should keep the transaction errors names, codes and causes", () => {
    const cause = new Error("driver error");
    expect(new QErrors.RolledBack("insufficient funds")).toMatchObject({
      name: "QRolledBackError",
      code: "ROLLED_BACK",
      message: "Transaction rolled back: insufficient funds",
      statusCode: 500,
    });
    expect(
      new QErrors.RolledBack("insufficient funds", { cause })
    ).toMatchObject({ code: "ROLLED_BACK", cause });
    expect(new QErrors.RolledBack()).not.toHaveProperty("cause");
    expect(new QErrors.RolledBack().message).toBe("Transaction rolled back");
    expect(new QErrors.RolledBack("").message).toBe("Transaction rolled back");
    expect(
      new QErrors.TransactionFailed("driver error", { cause })
    ).toMatchObject({
      name: "QTransactionFailedError",
      code: "TRANSACTION_FAILED",
      message: "Transaction failed: driver error",
      statusCode: 500,
      cause,
    });
    expect(new QErrors.RolledBack()).not.toBeInstanceOf(
      QErrors.TransactionFailed
    );
  });

  it("should suggest 504 for timeouts and 499 for other aborts", () => {
    const timeoutReason = new DOMException("timed out", "TimeoutError");
    expect(new QErrors.Aborted("x", { cause: timeoutReason }).statusCode).toBe(
      504
    );
    expect(
      new QErrors.Aborted("x", {
        cause: new DOMException("aborted", "AbortError"),
      }).statusCode
    ).toBe(499);
    expect(new QErrors.Aborted("x").statusCode).toBe(499);
    expect(new QErrors.Aborted("x", { cause: "reason" }).statusCode).toBe(499);
    expectTypeOf(new QErrors.Aborted("x").statusCode).toEqualTypeOf<
      499 | 504
    >();
  });

  it("should expose a suggested http statusCode", () => {
    const noResult = new QErrors.NoResult();
    const tooMany = new QErrors.TooManyResults(2);
    expect(noResult.statusCode).toBe(404);
    expect(tooMany.statusCode).toBe(500);
    expect(new QErrors.QueryFailed("x").statusCode).toBe(500);
    expectTypeOf(new QErrors.QueryFailed("x").statusCode).toEqualTypeOf<500>();
    expectTypeOf(noResult.statusCode).toEqualTypeOf<404>();
    expectTypeOf(tooMany.statusCode).toEqualTypeOf<500>();
  });
});

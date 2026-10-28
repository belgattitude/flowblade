import { describe, expect, expectTypeOf, it } from "vitest";

import { QErrors } from "../index";
import { QAbortedError } from "./q-aborted-error";
import { QNoResultError } from "./q-no-result-error";
import { QQueryFailedError } from "./q-query-failed-error";
import { QTooManyResultsError } from "./q-too-many-results-error";

describe("QErrors", () => {
  it("should expose the error classes", () => {
    expect(QErrors.NoResult).toBe(QNoResultError);
    expect(QErrors.TooManyResults).toBe(QTooManyResultsError);
    expect(QErrors.QueryFailed).toBe(QQueryFailedError);
    expect(QErrors.Aborted).toBe(QAbortedError);
    expect(Object.keys(QErrors).toSorted()).toStrictEqual([
      "Aborted",
      "NoResult",
      "QueryFailed",
      "TooManyResults",
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

  it("should be usable as types", () => {
    const getRowCount = (e: QErrors.TooManyResults) => e.rowCount;
    expect(getRowCount(new QErrors.TooManyResults(2))).toBe(2);
    expectTypeOf<QErrors.NoResult>().toEqualTypeOf<QNoResultError>();
  });

  it("should keep the error names and codes", () => {
    expect(new QErrors.NoResult()).toMatchObject({
      name: "QNoResultError",
      code: "NO_RESULT",
    });
    expect(new QErrors.TooManyResults(2)).toMatchObject({
      name: "QTooManyResultsError",
      code: "TOO_MANY_RESULTS",
      rowCount: 2,
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

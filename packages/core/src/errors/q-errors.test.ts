import { describe, expect, expectTypeOf, it } from "vitest";

import { QErrors } from "../index";
import { QNoResultError } from "./q-no-result-error";
import { QTooManyResultsError } from "./q-too-many-results-error";

describe("QErrors", () => {
  it("should expose the error classes", () => {
    expect(QErrors.NoResult).toBe(QNoResultError);
    expect(QErrors.TooManyResults).toBe(QTooManyResultsError);
    expect(Object.keys(QErrors).toSorted()).toStrictEqual([
      "NoResult",
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

  it("should expose a suggested http statusCode", () => {
    const noResult = new QErrors.NoResult();
    const tooMany = new QErrors.TooManyResults(2);
    expect(noResult.statusCode).toBe(404);
    expect(tooMany.statusCode).toBe(500);
    expectTypeOf(noResult.statusCode).toEqualTypeOf<404>();
    expectTypeOf(tooMany.statusCode).toEqualTypeOf<500>();
  });
});

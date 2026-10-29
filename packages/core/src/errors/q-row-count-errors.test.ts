import { describe, expect, it } from "vitest";

import pkg from "../../package.json" with { type: "json" };
import { brandKey } from "../utils/brand";
import { QNoResultError } from "./q-no-result-error";
import { QTooManyResultsError } from "./q-too-many-results-error";

/**
 * Simulate an error created by another copy of @flowblade/core
 */
const createForeignError = (brands: string[], code: string) => {
  const error = Object.assign(new Error("foreign"), { code });
  Object.defineProperty(error, brandKey, { value: brands });
  return error;
};

describe(QNoResultError, () => {
  it("should be an Error with the NO_RESULT code", () => {
    const error = new QNoResultError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(QNoResultError);
    expect(error.name).toBe("QNoResultError");
    expect(error.code).toBe("NO_RESULT");
    expect(error.message).toBe("Expected exactly one row, received none");
  });

  it("should recognize errors from another copy of the same major", () => {
    expect(
      createForeignError(["QNoResultError"], "NO_RESULT") instanceof
        QNoResultError
    ).toBe(true);
  });
});

describe(QTooManyResultsError, () => {
  it("should be an Error with the TOO_MANY_RESULTS code and row count", () => {
    const error = new QTooManyResultsError(3);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(QTooManyResultsError);
    expect(error.name).toBe("QTooManyResultsError");
    expect(error.code).toBe("TOO_MANY_RESULTS");
    expect(error.rowCount).toBe(3);
    expect(error.message).toBe("Expected exactly one row, received 3");
  });

  it("should recognize errors from another copy of the same major", () => {
    expect(
      createForeignError(
        ["QTooManyResultsError"],
        "TOO_MANY_RESULTS"
      ) instanceof QTooManyResultsError
    ).toBe(true);
  });
});

describe("brand", () => {
  it("should follow the package major version", () => {
    // not replaced when running from sources
    expect(Symbol.keyFor(brandKey)).toBe("@flowblade/core-vdev");
    expect(pkg.version.split(".")).toHaveLength(3);
  });

  it("should not leak the brand in serialization", () => {
    const error = new QTooManyResultsError(2);
    expect(Object.getOwnPropertyDescriptor(error, brandKey)?.enumerable).toBe(
      false
    );
    expect(JSON.stringify(error)).toBe(
      '{"name":"QTooManyResultsError","code":"TOO_MANY_RESULTS","statusCode":500,"rowCount":2}'
    );
  });

  it("should not confuse the error classes", () => {
    expect(new QNoResultError()).not.toBeInstanceOf(QTooManyResultsError);
    expect(new QTooManyResultsError(2)).not.toBeInstanceOf(QNoResultError);
  });

  it.each([
    ["null", null],
    ["a plain error", new Error("QNoResultError")],
    ["a plain object", { name: "QNoResultError", code: "NO_RESULT" }],
    [
      "an error branded without code",
      createForeignError(["QNoResultError"], undefined as never),
    ],
    [
      "an error branded as another class",
      createForeignError(["QTooManyResultsError"], "NO_RESULT"),
    ],
  ])("should not match %s", (_label, value) => {
    expect(value instanceof QNoResultError).toBe(false);
  });
});

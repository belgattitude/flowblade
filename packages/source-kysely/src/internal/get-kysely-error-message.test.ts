import { describe, expect, it } from "vitest";

import { getKyselyErrorMessage } from "./get-kysely-error-message.ts";

describe(getKyselyErrorMessage, () => {
  it.for([
    ["an Error", new Error("Invalid column"), "Invalid column"],
    [
      "an array of errors (ie: tedious)",
      [new Error("first"), "second"],
      "first; second",
    ],
    ["an unknown value", { reason: "?" }, "Unknown error"],
  ] as const)("should return the message of %s", ([, error, expected]) => {
    expect(getKyselyErrorMessage(error)).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";

import { getKnexErrorMessage } from "./get-knex-error-message.ts";

describe(getKnexErrorMessage, () => {
  it("should return the message of an error", () => {
    expect(getKnexErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("should join the messages of an array of errors", () => {
    expect(getKnexErrorMessage([new Error("a"), "b"])).toBe("a; b");
  });

  it("should fallback for unknown errors", () => {
    expect(getKnexErrorMessage("boom")).toBe("Unknown error");
    expect(getKnexErrorMessage(undefined)).toBe("Unknown error");
  });
});

import { describe, expect, it } from "vitest";

import { removeUndefined } from "./remove-undefined";

describe(removeUndefined, () => {
  it("should work as expected", () => {
    expect(removeUndefined({ k: 1, u: undefined })).toStrictEqual({
      k: 1,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { createExponentialBackoff } from "./retry-backoff";

const retries = [1, 2, 3, 5, 6, 10];

describe("createExponentialBackoff", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should default to 50ms doubled up to 1s with equal jitter", () => {
    const delayMs = createExponentialBackoff();
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(retries.map(delayMs)).toStrictEqual([25, 50, 100, 400, 500, 500]);
    vi.spyOn(Math, "random").mockReturnValue(0.999_999);
    expect(retries.map(delayMs)).toStrictEqual([50, 100, 200, 800, 1000, 1000]);
  });

  it("should support the full and none jitters", () => {
    const options = { initialDelayMs: 100, maxDelayMs: 500 };
    const full = createExponentialBackoff({ ...options, jitter: "full" });
    const none = createExponentialBackoff({ ...options, jitter: "none" });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(retries.map(full)).toStrictEqual([0, 0, 0, 0, 0, 0]);
    expect(retries.map(none)).toStrictEqual([100, 200, 400, 500, 500, 500]);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(retries.map(full)).toStrictEqual([50, 100, 200, 250, 250, 250]);
  });

  it("should return integer delays within the bounds", () => {
    const delayMs = createExponentialBackoff({ jitter: "full" });
    for (let i = 0; i < 1000; i++) {
      const delay = delayMs(3);
      expect(Number.isInteger(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(200);
    }
  });

  it("should reject invalid delays", () => {
    expect(() => createExponentialBackoff({ initialDelayMs: -1 })).toThrow(
      "initialDelayMs must be a non-negative finite number, got -1"
    );
    expect(() =>
      createExponentialBackoff({ maxDelayMs: Number.POSITIVE_INFINITY })
    ).toThrow(TypeError);
  });
});

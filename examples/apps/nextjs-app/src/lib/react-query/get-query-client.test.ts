import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerQueryCache } from "./get-query-client";

describe("ServerQueryCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forces gcTime Infinity, even with per-query gcTime, and schedules no timer", () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const queryCache = new ServerQueryCache();
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: 600_000 } },
      queryCache,
    });
    const query = queryCache.build(client, {
      gcTime: 60_000,
      queryKey: ["a"],
    });
    query.setOptions({ gcTime: 1000, queryKey: ["a"] });

    expect(query.gcTime).toBe(Number.POSITIVE_INFINITY);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});

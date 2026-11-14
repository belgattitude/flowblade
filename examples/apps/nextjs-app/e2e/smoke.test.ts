import { describe, expect, it } from "vitest";

import { E2E_BASE_URL } from "./e2e.constants";

const get = (path: string) => fetch(`${E2E_BASE_URL}${path}`);

describe("nextjs-app smoke (next start)", () => {
  it("GET /health returns the server time", async () => {
    const res = await get("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { time: string };
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it.each(["/", "/dashboard", "/demo/duckdb"])(
    "GET %s server-renders html",
    async (path) => {
      const res = await get(path);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      await expect(res.text()).resolves.toContain(
        "<title>Flowblade nextjs app</title>"
      );
    }
  );

  it("serves repeated SSR requests (fresh QueryClient per request)", async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await get("/demo/duckdb");
      expect(res.status).toBe(200);
      await res.text();
    }
  });
});

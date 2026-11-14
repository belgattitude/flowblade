// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getNextjsHostInfo } from "./get-nextjs-host-info";

describe("getNextjsHostInfo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const clear = () => {
    for (const key of [
      "BASE_URL",
      "PORT",
      "NEXT_PUBLIC_VERCEL_ENV",
      "NEXT_PUBLIC_VERCEL_URL",
      "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
    ]) {
      vi.stubEnv(key, undefined);
    }
  };

  it("falls back to localhost (never https://undefined) when no env is set", () => {
    clear();
    expect(getNextjsHostInfo().baseUrl).toBe("http://localhost:3000");
  });

  it("uses PORT for the localhost fallback", () => {
    clear();
    vi.stubEnv("PORT", "4000");
    expect(getNextjsHostInfo().baseUrl).toBe("http://localhost:4000");
  });

  it("prefers BASE_URL", () => {
    clear();
    vi.stubEnv("BASE_URL", "http://example.test");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "prod.test");
    expect(getNextjsHostInfo().baseUrl).toBe("http://example.test");
  });

  it("uses the vercel preview url", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "preview.test");
    expect(getNextjsHostInfo().baseUrl).toBe("https://preview.test");
  });

  it("uses the vercel production url", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "prod.test");
    expect(getNextjsHostInfo().baseUrl).toBe("https://prod.test");
  });

  it("falls back to localhost when the vercel host is missing", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    expect(getNextjsHostInfo().baseUrl).toBe("http://localhost:3000");
  });
});

import { describe, expect, it } from "vitest";

import { isSafeDbFilename, isSafeDbPathname } from "./db-path-validators.ts";

describe("isSafeDbFilename", () => {
  it.each(["/tmp/duckdb.db", "C:\\data\\sub\\duckdb.db", "duckdb.db"])(
    "should accept %s",
    (path) => {
      expect(isSafeDbFilename(path)).toBe(true);
    }
  );

  it.each(["/tmp/", "/tmp/..", "C:\\data\\sub\\"])(
    "should reject %s",
    (path) => {
      expect(isSafeDbFilename(path)).toBe(false);
    }
  );
});

describe("isSafeDbPathname", () => {
  it.each(["/tmp/duckdb.db", "C:\\data\\sub\\duckdb.db"])(
    "should accept %s",
    (path) => {
      expect(isSafeDbPathname(path)).toBe(true);
    }
  );

  it.each([
    "/tmp/../etc/duckdb.db",
    "..\\..\\etc\\duckdb.db",
    "C:\\data\\..\\..\\duckdb.db",
  ])("should reject %s", (path) => {
    expect(isSafeDbPathname(path)).toBe(false);
  });
});

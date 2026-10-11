import { parseDsnOrThrow } from "@httpx/dsn-parser";
import { describe, expect, it } from "vitest";

import { dsnToConnectionParams } from "./dsn-to-connection-params.ts";

describe("dsnToConnectionParams", () => {
  it("should map host, db, path and options", () => {
    const parsed = parseDsnOrThrow(
      "duckdb://filesystem/main_db?path=/tmp/duckdb.db&accessMode=READ_ONLY"
    );
    expect(dsnToConnectionParams(parsed)).toStrictEqual({
      type: "filesystem",
      alias: "main_db",
      path: "/tmp/duckdb.db",
      options: { accessMode: "READ_ONLY" },
    });
  });

  it("should treat an empty path as absent", () => {
    const parsed = parseDsnOrThrow("duckdb://memory/memory_db?path=");
    expect(dsnToConnectionParams(parsed)).toStrictEqual({
      type: "memory",
      alias: "memory_db",
      options: {},
    });
  });
});

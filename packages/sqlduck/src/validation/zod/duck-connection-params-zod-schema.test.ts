import { describe, expect, it } from "vitest";

import { duckConnectionParamsZodSchema } from "./duck-connection-params-zod-schema.ts";

const filesystemParams = (path: string) => {
  return {
    type: "filesystem",
    alias: "my_db",
    path,
  };
};

describe("duckConnectionParamsZodSchema", () => {
  describe("filesystem path", () => {
    it.for([
      "/tmp/duckdb.db",
      // Relative paths are accepted (resolved by DuckDB)
      "relative/duckdb.db",
      // Backslashes are normalized as separators, all of them
      String.raw`/data\sub\duckdb.db`,
    ])("should accept %s", (path) => {
      expect(
        duckConnectionParamsZodSchema.safeParse(filesystemParams(path)).success
      ).toBe(true);
    });

    it.for(["/tmp/../etc/duckdb.db", String.raw`/data\..\..\etc\duckdb.db`])(
      "should reject %s",
      (path) => {
        expect(
          duckConnectionParamsZodSchema.safeParse(filesystemParams(path))
            .success
        ).toBe(false);
      }
    );

    it("should explain a path traversal rejection", () => {
      const result = duckConnectionParamsZodSchema.safeParse(
        filesystemParams("/tmp/../etc/duckdb.db")
      );
      expect(result.error?.issues[0]?.message).toBe(
        "Invalid database pathname - it must not contain path traversal (..)"
      );
    });
  });
});

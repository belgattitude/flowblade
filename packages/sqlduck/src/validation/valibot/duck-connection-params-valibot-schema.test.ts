import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { duckConnectionParamsValibotSchema } from "./duck-connection-params-valibot-schema.ts";

const filesystemParams = (path: string) => {
  return {
    type: "filesystem",
    alias: "my_db",
    path,
  };
};

describe("duckConnectionParamsValibotSchema", () => {
  describe("filesystem path", () => {
    it.for([
      "/tmp/duckdb.db",
      // Relative paths are accepted (resolved by DuckDB)
      "relative/duckdb.db",
      // Backslashes are normalized as separators, all of them
      String.raw`/data\sub\duckdb.db`,
    ])("should accept %s", (path) => {
      expect(
        v.safeParse(duckConnectionParamsValibotSchema, filesystemParams(path))
          .success
      ).toBe(true);
    });

    it.for(["/tmp/../etc/duckdb.db", String.raw`/data\..\..\etc\duckdb.db`])(
      "should reject %s",
      (path) => {
        expect(
          v.safeParse(duckConnectionParamsValibotSchema, filesystemParams(path))
            .success
        ).toBe(false);
      }
    );

    it("should explain a path traversal rejection", () => {
      const result = v.safeParse(
        duckConnectionParamsValibotSchema,
        filesystemParams("/tmp/../etc/duckdb.db")
      );
      expect(result.issues?.[0]?.message).toBe(
        "Invalid database pathname - it must not contain path traversal (..)"
      );
    });
  });
});

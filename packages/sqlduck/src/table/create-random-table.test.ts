import { describe, expect, it } from "vitest";

import { Table } from "../objects/table.ts";
import { isDuckdbValidIdentifier } from "../validation/core/is-duckdb-valid-identifier.ts";
import { createRandomTable } from "./create-random-table.ts";

describe("createRandomTable", () => {
  it("should create a table with a random name", () => {
    const createdTable = createRandomTable({
      prefix: "tmp_",
      schema: "test_schema",
      database: "test_database",
    });
    expect(createdTable).toBeInstanceOf(Table);
    expect(isDuckdbValidIdentifier(createdTable.tableName)).toBe(true);
    expect(createdTable.tableName).toMatch(/^tmp_([a-z0-9_]){16}$/);
    expect(createdTable.schemaName).toBe("test_schema");
    expect(createdTable.databaseName).toBe("test_database");
  });
});

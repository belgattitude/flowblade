import type { DuckDBConnection } from "@duckdb/node-api";
import { reset } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";
import isInCi from "is-in-ci";
import { beforeAll } from "vitest";

import { createDuckdbTestMemoryDb } from "#/tests/utils/create-duckdb-test-memory-db.ts";

import { Table } from "../objects/table.ts";
import { isDuckdbValidIdentifier } from "../validation/core/is-duckdb-valid-identifier.ts";
import { createRandomTable } from "./create-random-table.ts";

describe("createRandomTable", () => {
  let conn: DuckDBConnection;
  beforeAll(async () => {
    conn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? "128M" : "256M",
      threads: 1,
    });
  });
  afterAll(() => {
    conn.closeSync();
  });

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

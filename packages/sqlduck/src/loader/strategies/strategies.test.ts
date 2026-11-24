import type { DuckDBConnection } from "@duckdb/node-api";
import { INTEGER, VARCHAR } from "@duckdb/node-api";
import { describe, expect, vi } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";
import { loadStrategies } from "#tests/utils/load-strategies.ts";

import { sqlduckDefaultLogtapeLogger } from "../../logger/sqlduck-default-logtape-logger.ts";
import { Table } from "../../objects/table.ts";
import { zodCodecs } from "../../utils/zod-codecs.ts";
import type { InferZodRelaxedDataSchema } from "../../validation/zod/index.ts";
import { DuckTableLoader } from "../duck-table-loader.ts";
import { PreparedInsertStrategy } from "./prepared-insert/prepared-insert-strategy.ts";
import { RowAppenderStrategy } from "./row-appender/row-appender-strategy.ts";

const it = createDuckTest({ threads: 1 });

const typesSchema = z.strictObject({
  id: z.int32().meta({ primaryKey: true }),
  name: z.string().nullable(),
  big: zodCodecs.bigintToString,
  uid: z.nullable(z.uuid()),
  tags: z.array(z.string()).nullable(),
  price: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
  ts: z.nullable(z.string().meta({ duckdbType: "TIMESTAMP" })),
  status: z.enum(["draft", "published"]),
});

type TypesRow = InferZodRelaxedDataSchema<typeof typesSchema>;

const typesRows: TypesRow[] = [
  {
    id: 1,
    name: "a",
    big: 9_223_372_036_854_775_807n,
    uid: "019d2155-d292-71fa-87d7-9d1f1ed83569",
    tags: ["x", "y"],
    price: 1.23,
    ts: "2025-01-02T03:04:05.678Z",
    status: "draft",
  },
  {
    id: 2,
    name: null,
    big: -1n,
    uid: null,
    tags: null,
    price: -99_999_999.99,
    ts: null,
    status: "published",
  },
  {
    id: 3,
    name: "c",
    big: 0n,
    uid: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    tags: [],
    price: 0,
    ts: null,
    status: "draft",
  },
];

const selectAsText = async (conn: DuckDBConnection, table: string) => {
  const reader = await conn.runAndReadAll(
    `SELECT id, name, big::VARCHAR AS big, uid::VARCHAR AS uid,
            tags::VARCHAR AS tags, price::VARCHAR AS price,
            ts::VARCHAR AS ts, status::VARCHAR AS status
     FROM ${table} ORDER BY id`
  );
  return reader.getRowObjectsJson();
};

describe.each(loadStrategies)("%s", (name, createStrategy) => {
  const tableName = `test_strategy_${name.toLowerCase()}`;

  it("should load all supported types", async ({ conn }) => {
    const result = await new DuckTableLoader({
      conn,
      strategy: createStrategy(2),
    }).load({
      table: new Table(tableName),
      schema: typesSchema,
      rows: typesRows,
      mode: "createOrReplace",
    });
    expect(result.totalRows).toBe(3);
    await expect(selectAsText(conn, tableName)).resolves.toStrictEqual([
      {
        id: 1,
        name: "a",
        big: "9223372036854775807",
        uid: "019d2155-d292-71fa-87d7-9d1f1ed83569",
        tags: "[x, y]",
        price: "1.23",
        ts: "2025-01-02 03:04:05.678",
        status: "draft",
      },
      {
        id: 2,
        name: null,
        big: "-1",
        uid: null,
        tags: null,
        price: "-99999999.99",
        ts: null,
        status: "published",
      },
      {
        id: 3,
        name: "c",
        big: "0",
        uid: "ffffffff-ffff-ffff-ffff-ffffffffffff",
        tags: "[]",
        price: "0.00",
        ts: null,
        status: "draft",
      },
    ]);
  });

  it("should reject a value that is not a member of the enum", async ({
    conn,
  }) => {
    const rows = structuredClone(typesRows);
    // @ts-expect-error invalid on purpose
    rows[2].status = "deleted";
    await expect(
      new DuckTableLoader({ conn, strategy: createStrategy(2) }).load({
        table: new Table(`${tableName}_enum`),
        schema: typesSchema,
        rows,
        mode: "createOrReplace",
      })
    ).rejects.toThrow(/'deleted'/);
  });
});

describe("RowAppenderStrategy", () => {
  it("should report the row index and column of a failing value", async ({
    conn,
  }) => {
    const rows = structuredClone(typesRows);
    // @ts-expect-error invalid on purpose
    rows[2].status = "deleted";
    await expect(
      new DuckTableLoader({
        conn,
        strategy: new RowAppenderStrategy({ chunkSize: 2 }),
      }).load({
        table: new Table("test_row_appender_error"),
        schema: typesSchema,
        rows,
        mode: "createOrReplace",
      })
    ).rejects.toThrow(
      "Failed to load data into table 'test_row_appender_error' - Row 2, column 'status' - "
    );
  });

  it("should keep only the rows flushed before a failing value", async ({
    conn,
  }) => {
    const rows = structuredClone(typesRows);
    // @ts-expect-error invalid on purpose
    rows[2].status = "deleted";
    const table = new Table("test_row_appender_flushed");
    await expect(
      new DuckTableLoader({
        conn,
        // flush every 2 rows
        strategy: new RowAppenderStrategy({ chunkSize: 2, flushEveryRows: 2 }),
      }).load({
        table,
        schema: typesSchema,
        rows,
        mode: "createOrReplace",
      })
    ).rejects.toThrow("Row 2, column 'status'");
    const reader = await conn.runAndReadAll(
      `SELECT id FROM ${table.getFullName()} ORDER BY id`
    );
    expect(reader.getRowObjectsJson()).toStrictEqual([{ id: 1 }, { id: 2 }]);
  });

  it("should reject an invalid chunkSize", () => {
    expect(() => new RowAppenderStrategy({ chunkSize: 0 })).toThrow(
      "chunkSize must be an integer between 1 and 2048, got 0"
    );
  });
});

describe("PreparedInsertStrategy", () => {
  const schema = z.object({
    id: z.int32().meta({ primaryKey: true }),
    name: z.string(),
  });
  const table = new Table("test_prepared_conflicts");

  const loadInto = (
    conn: DuckDBConnection,
    strategy: PreparedInsertStrategy,
    rows: { id: number; name: string }[]
  ) =>
    new DuckTableLoader({ conn, strategy }).load({
      table,
      schema,
      rows,
      mode: "createIfNotExists",
    });

  const selectAll = async (conn: DuckDBConnection) => {
    const reader = await conn.runAndReadAll(
      `SELECT id, name FROM ${table.getFullName()} ORDER BY id`
    );
    return reader.getRowObjectsJson();
  };

  it("should fail on a primary key conflict by default", async ({ conn }) => {
    await conn.run(`DROP TABLE IF EXISTS ${table.getFullName()}`);
    await loadInto(conn, new PreparedInsertStrategy(), [{ id: 1, name: "a" }]);
    await expect(
      loadInto(conn, new PreparedInsertStrategy(), [{ id: 1, name: "b" }])
    ).rejects.toThrow(/Constraint Error/i);
  });

  it("should keep existing rows with onConflict 'ignore'", async ({ conn }) => {
    await conn.run(`DROP TABLE IF EXISTS ${table.getFullName()}`);
    await loadInto(conn, new PreparedInsertStrategy(), [{ id: 1, name: "a" }]);
    await loadInto(conn, new PreparedInsertStrategy({ onConflict: "ignore" }), [
      { id: 1, name: "b" },
      { id: 2, name: "c" },
    ]);
    await expect(selectAll(conn)).resolves.toStrictEqual([
      { id: 1, name: "a" },
      { id: 2, name: "c" },
    ]);
  });

  it("should upsert rows with onConflict 'replace'", async ({ conn }) => {
    await conn.run(`DROP TABLE IF EXISTS ${table.getFullName()}`);
    await loadInto(conn, new PreparedInsertStrategy(), [{ id: 1, name: "a" }]);
    await loadInto(
      conn,
      new PreparedInsertStrategy({ onConflict: "replace" }),
      [
        { id: 1, name: "b" },
        { id: 2, name: "c" },
      ]
    );
    await expect(selectAll(conn)).resolves.toStrictEqual([
      { id: 1, name: "b" },
      { id: 2, name: "c" },
    ]);
  });

  it("should quote the database, schema and table names", async ({ conn }) => {
    await conn.run(`ATTACH IF NOT EXISTS ':memory:' AS "my-data"`);
    await conn.run(
      `CREATE OR REPLACE TABLE "my-data".main."order" (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL)`
    );
    const result = await new DuckTableLoader({
      conn,
      strategy: new PreparedInsertStrategy(),
    }).load({
      table: new Table({ name: "order", schema: "main", database: "my-data" }),
      schema,
      rows: [{ id: 1, name: "a" }],
      mode: "append",
    });
    expect(result.totalRows).toBe(1);
  });

  it("should use one prepared statement, whatever the chunk sizes", async ({
    conn,
  }) => {
    let prepared = 0;
    let destroyed = 0;
    const prepare = conn.prepare.bind(conn);
    const spy = vi.spyOn(conn, "prepare").mockImplementation(async (sql) => {
      const statement = await prepare(sql);
      prepared += 1;
      const destroySync = statement.destroySync.bind(statement);
      statement.destroySync = () => {
        destroyed += 1;
        destroySync();
      };
      return statement;
    });
    try {
      const strategy = new PreparedInsertStrategy({ chunkSize: 4 });
      const session = await strategy.open({
        conn,
        table: new Table("test_prepared_sizes"),
        columnNames: ["id", "name"],
        columnTypes: [INTEGER, VARCHAR],
        logger: sqlduckDefaultLogtapeLogger,
      });
      await conn.run(
        "CREATE OR REPLACE TABLE test_prepared_sizes (id INTEGER, name VARCHAR)"
      );
      // Full chunks, partial chunks of any size and an empty one
      let id = 0;
      for (const size of [4, 1, 4, 0, 2, 3, 4, 1]) {
        const ids = Array.from({ length: size }, () => id++);
        await session.appendChunk([ids, ids.map(String)]);
      }
      await session.complete();
      expect(prepared).toBe(1);
      expect(destroyed).toBe(1);
      const reader = await conn.runAndReadAll(
        "SELECT count(*)::INTEGER AS count FROM test_prepared_sizes"
      );
      expect(reader.getRowObjects()).toStrictEqual([{ count: id }]);
    } finally {
      spy.mockRestore();
    }
  });

  it("should not prepare a statement when there is no row", async ({
    conn,
  }) => {
    const spy = vi.spyOn(conn, "prepare");
    try {
      const session = await new PreparedInsertStrategy().open({
        conn,
        table: new Table("test_prepared_no_rows"),
        columnNames: ["id"],
        columnTypes: [INTEGER],
        logger: sqlduckDefaultLogtapeLogger,
      });
      await session.appendChunk([[]]);
      await session.complete();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  // DuckDB doesn't let a row of a statement replace an earlier row of the
  // same statement: 'replace' only overwrites rows inserted before the chunk
  for (const onConflict of ["replace", "ignore"] as const) {
    it(`should keep the first of the rows sharing a key within a chunk with onConflict '${onConflict}'`, async ({
      conn,
    }) => {
      await conn.run(`DROP TABLE IF EXISTS ${table.getFullName()}`);
      await loadInto(conn, new PreparedInsertStrategy({ onConflict }), [
        { id: 1, name: "first" },
        { id: 1, name: "middle" },
        { id: 1, name: "last" },
      ]);
      await expect(selectAll(conn)).resolves.toStrictEqual([
        { id: 1, name: "first" },
      ]);
    });
  }

  it("should load enum members containing quotes", async ({ conn }) => {
    const enumTable = new Table("test_prepared_enum_quotes");
    await new DuckTableLoader({
      conn,
      strategy: new PreparedInsertStrategy(),
    }).load({
      table: enumTable,
      schema: z.strictObject({
        status: z.enum(["it's", 'say "hi"']),
        tags: z.array(z.enum(["a'b", "c"])),
      }),
      rows: [{ status: "it's", tags: ["a'b", "c"] }],
      mode: "createOrReplace",
    });
    const reader = await conn.runAndReadAll(
      `SELECT status::VARCHAR AS status, tags FROM ${enumTable.getFullName()}`
    );
    expect(reader.getRowObjectsJson()).toStrictEqual([
      { status: "it's", tags: ["a'b", "c"] },
    ]);
  });

  it("should reject an invalid chunkSize", () => {
    expect(() => new PreparedInsertStrategy({ chunkSize: 2049 })).toThrow(
      "chunkSize must be an integer between 1 and 2048, got 2049"
    );
  });
});

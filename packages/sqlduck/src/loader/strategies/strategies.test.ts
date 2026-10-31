import type { DuckDBConnection } from "@duckdb/node-api";
import { describe, expect } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";

import { Table } from "../../objects/table.ts";
import { zodCodecs } from "../../utils/zod-codecs.ts";
import { DuckTableLoader } from "../duck-table-loader.ts";
import type { LoadStrategy } from "../types.ts";
import { ChunkAppenderStrategy } from "./chunk-appender/chunk-appender-strategy.ts";
import { PreparedInsertStrategy } from "./prepared-insert/prepared-insert-strategy.ts";
import { RowAppenderStrategy } from "./row-appender/row-appender-strategy.ts";

const it = createDuckTest({ threads: 1 });

const strategies: [string, (chunkSize: number) => LoadStrategy][] = [
  [
    "ChunkAppenderStrategy",
    (chunkSize) => new ChunkAppenderStrategy({ chunkSize }),
  ],
  [
    "RowAppenderStrategy",
    (chunkSize) => new RowAppenderStrategy({ chunkSize }),
  ],
  [
    "PreparedInsertStrategy",
    (chunkSize) => new PreparedInsertStrategy({ rowsPerInsert: chunkSize }),
  ],
];

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

type TypesRow = z.input<typeof typesSchema>;

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

describe.each(strategies)("%s", (name, createStrategy) => {
  const tableName = `test_strategy_${name.toLowerCase()}`;

  it("should load all supported types", async ({ conn }) => {
    const result = await new DuckTableLoader({
      conn,
      strategy: createStrategy(2),
    }).load({
      table: new Table(tableName),
      schema: typesSchema,
      rows: (function* gen() {
        yield* typesRows;
      })(),
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
        rows: (function* gen() {
          yield* rows;
        })(),
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
        rows: (function* gen() {
          yield* rows;
        })(),
        mode: "createOrReplace",
      })
    ).rejects.toThrow(
      "Failed to append data into table 'test_row_appender_error' - Row 2, column 'status' - "
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
        // flush after each chunk of 2 rows
        strategy: new RowAppenderStrategy({ chunkSize: 2, flushEvery: 1 }),
      }).load({
        table,
        schema: typesSchema,
        rows: (function* gen() {
          yield* rows;
        })(),
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
      "chunkSize must be a number between 1 and 2048"
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
      rows: (function* gen() {
        yield* rows;
      })(),
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

  it("should reject an invalid rowsPerInsert", () => {
    expect(() => new PreparedInsertStrategy({ rowsPerInsert: 2049 })).toThrow(
      "rowsPerInsert must be a number between 1 and 2048"
    );
  });
});

import { describe, expect } from "vitest";

import {
  createFullSupportedRows,
  loaderFullSupportedSchema,
} from "#tests/data/loader-full-supported-dataset.ts";
import { expectedFullSupportedEdgeRows } from "#tests/data/loader-full-supported-expected.ts";
import { createDuckTest } from "#tests/utils/duck-test.ts";
import {
  loadStrategies,
  strategyTableName,
} from "#tests/utils/load-strategies.ts";

import { Table } from "../../../src/index.ts";
import { DuckTableLoader } from "../../../src/loader/index.ts";
import { getTableCreateFromZod } from "../../../src/table/get-table-create-from-zod.ts";

const it = createDuckTest({ threads: 1 });

// Not a multiple of the chunk size, to get a smaller last chunk
const rowCount = 4321;
const chunkSize = 1000;

// md5 of the table content by strategy, compared once all strategies ran
const fingerprints = new Map<string, string>();

const sumOf = (fn: (row: (typeof rows)[number]) => number) =>
  rows.reduce((acc, row) => acc + fn(row), 0);

const rows = [...createFullSupportedRows(rowCount)];

describe.each(loadStrategies)("%s", (name, createStrategy) => {
  const tableName = strategyTableName("full_supported", name);
  const table = new Table(tableName);

  it("should load the full supported schema", async ({ conn }) => {
    const result = await new DuckTableLoader({
      conn,
      strategy: createStrategy(chunkSize),
    }).load({
      table,
      schema: loaderFullSupportedSchema,
      rows: createFullSupportedRows(rowCount),
      mode: "createOrReplace",
    });
    expect(result).toMatchObject({
      totalRows: rowCount,
      mode: "createOrReplace",
    });

    // Column types are the ones of the schema
    const { columnTypes } = getTableCreateFromZod({
      table,
      schema: loaderFullSupportedSchema,
    });
    const described = await conn.runAndReadAll(
      `SELECT column_name, column_type FROM (DESCRIBE ${tableName})`
    );
    expect(
      described.getRowObjectsJson().map((r) => [r.column_name, r.column_type])
    ).toStrictEqual(
      [...columnTypes].map(([column, type]) => [column, type.toString()])
    );

    const counts = await conn.runAndReadAll(
      `SELECT count(*)::INTEGER AS total, count(DISTINCT id)::INTEGER AS ids FROM ${tableName}`
    );
    expect(counts.getRowObjects()).toStrictEqual([
      { total: rowCount, ids: rowCount },
    ]);
  });

  it("should store the edge rows (lowest, highest and null values)", async ({
    conn,
  }) => {
    const reader = await conn.runAndReadAll(
      `SELECT * FROM ${tableName} WHERE id < 3 ORDER BY id`
    );
    expect(reader.getRowObjectsJson()).toStrictEqual(
      expectedFullSupportedEdgeRows
    );
  });

  it("should store every row, whatever the chunk it was in", async ({
    conn,
  }) => {
    const reader = await conn.runAndReadAll(
      `SELECT id::INTEGER AS id, name, email, js_number_tinyint, js_number_int32,
              is_active, js_enum::VARCHAR AS js_enum
       FROM ${tableName} ORDER BY id`
    );
    expect(reader.getRowObjectsJS()).toStrictEqual(
      rows.map((row) => {
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          js_number_tinyint: row.js_number_tinyint,
          js_number_int32: row.js_number_int32,
          is_active: row.is_active,
          js_enum: row.js_enum,
        };
      })
    );
  });

  it("should store nulls and list items", async ({ conn }) => {
    const reader = await conn.runAndReadAll(
      `SELECT count(email)::INTEGER AS emails,
              count(bignumber)::INTEGER AS bignumbers,
              count(ts)::INTEGER AS timestamps,
              count(decimal_38_10)::INTEGER AS decimals,
              count(nullable_list_of_strings)::INTEGER AS nullable_lists,
              sum(len(list_of_strings))::INTEGER AS strings,
              sum(len(list_of_enums))::INTEGER AS enums,
              sum(len(list_of_uuids))::INTEGER AS uuids,
              sum(len(list_of_timestamps))::INTEGER AS list_timestamps
       FROM ${tableName}`
    );
    expect(reader.getRowObjects()).toStrictEqual([
      {
        emails: rows.filter((r) => r.email !== null).length,
        bignumbers: rows.filter((r) => r.bignumber !== null).length,
        timestamps: rows.filter((r) => r.ts !== null).length,
        decimals: rows.filter((r) => r.decimal_38_10 !== null).length,
        nullable_lists: rows.filter((r) => r.nullable_list_of_strings !== null)
          .length,
        strings: sumOf((r) => r.list_of_strings.length),
        enums: sumOf((r) => r.list_of_enums.length),
        uuids: sumOf((r) => r.list_of_uuids.length),
        list_timestamps: sumOf((r) => r.list_of_timestamps.length),
      },
    ]);
  });

  it("should apply the collation of a VARCHAR column", async ({ conn }) => {
    // Rows alternate between 'Name-<id>' and 'NAME-<id>'
    const reader = await conn.runAndReadAll(
      `SELECT count(*)::INTEGER AS count FROM ${tableName} WHERE name_nocase = 'name-10'`
    );
    expect(reader.getRowObjects()).toStrictEqual([{ count: 1 }]);
  });

  it("should fingerprint the table content", async ({ conn }) => {
    const reader = await conn.runAndReadAll(
      `SELECT md5(string_agg(t::VARCHAR, '|' ORDER BY id)) AS fingerprint FROM ${tableName} t`
    );
    const fingerprint = reader.getRowObjects()[0]?.fingerprint;
    expect(fingerprint).toStrictEqual(expect.any(String));
    fingerprints.set(name, fingerprint as string);
  });
});

describe("strategies parity", () => {
  it("should store the same table content whatever the strategy", () => {
    expect([...fingerprints.keys()].toSorted()).toStrictEqual(
      loadStrategies.map(([name]) => name).toSorted()
    );
    expect(new Set(fingerprints.values()).size).toBe(1);
  });
});

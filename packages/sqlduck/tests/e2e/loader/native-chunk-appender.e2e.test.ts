import { describe, expect } from "vitest";
import * as z from "zod";

import {
  createFullSupportedRows,
  loaderFullSupportedSchema,
} from "#tests/data/loader-full-supported-dataset.ts";
import { createDuckTest } from "#tests/utils/duck-test.ts";

import { Table } from "../../../src/index.ts";
import {
  DuckTableLoader,
  NativeChunkAppenderStrategy,
} from "../../../src/loader/index.ts";
import { getNativeWriterColumns } from "../../../src/loader/strategies/native-chunk-appender/create-data-chunk-writer.ts";
import { getTableCreateFromZod } from "../../../src/table/get-table-create-from-zod.ts";

const it = createDuckTest({ threads: 1 });

describe("NativeChunkAppenderStrategy", () => {
  it("should write the columns of the full supported schema natively", () => {
    const { columnTypes } = getTableCreateFromZod({
      table: new Table("native_columns"),
      schema: loaderFullSupportedSchema,
    });
    const names = [...columnTypes.keys()];
    const flags = getNativeWriterColumns([...columnTypes.values()]);
    // Guards against a silent fallback to node-api, which would make the
    // other e2e tests pass without testing the native path
    expect(names.filter((_, i) => !flags[i])).toStrictEqual([
      "hugeint",
      "decimal_38_10",
    ]);
  });

  it("should report its name and load rows", async ({ conn }) => {
    const result = await new DuckTableLoader({
      conn,
      strategy: new NativeChunkAppenderStrategy({
        chunkSize: 100,
        flushEveryRows: 150,
      }),
    }).load({
      table: new Table("native_loader"),
      schema: loaderFullSupportedSchema,
      rows: createFullSupportedRows(1000),
      mode: "createOrReplace",
    });
    expect(result).toMatchObject({
      strategy: "nativeChunkAppender",
      totalRows: 1000,
    });
  });

  it("should reject a value out of the range of its column, and not append the chunk", async ({
    conn,
  }) => {
    const table = new Table("native_out_of_range");
    await expect(
      new DuckTableLoader({
        conn,
        strategy: new NativeChunkAppenderStrategy({ chunkSize: 2 }),
      }).load({
        table,
        schema: z.strictObject({ id: z.int32(), small: z.int32() }),
        rows: [
          { id: 1, small: 1 },
          { id: 2, small: 2 },
          { id: 3, small: 2 ** 31 },
          { id: 4, small: 4 },
        ],
        mode: "createOrReplace",
      })
    ).rejects.toThrow(/out of int32 range/);

    // The first chunk was appended, the one holding the invalid value wasn't
    const reader = await conn.runAndReadAll(
      `SELECT count(*)::INTEGER AS count FROM ${table.getFullName()}`
    );
    expect(reader.getRowObjects()).toStrictEqual([{ count: 2 }]);
  });

  it.each([
    [{ chunkSize: 0 }, "chunkSize must be an integer between 1 and 2048"],
    [{ chunkSize: 2049 }, "chunkSize must be an integer between 1 and 2048"],
    [{ chunkSize: 1.5 }, "chunkSize must be an integer between 1 and 2048"],
    [{ flushEveryRows: 0 }, "flushEveryRows must be a positive integer"],
    [
      { flushEveryRows: Number.NaN },
      "flushEveryRows must be a positive integer",
    ],
  ])("should reject the options %j", (options, message) => {
    expect(() => new NativeChunkAppenderStrategy(options)).toThrow(message);
  });
});

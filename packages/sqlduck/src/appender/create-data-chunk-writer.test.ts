import {
  BIGINT,
  BOOLEAN,
  DATE,
  DECIMAL,
  DOUBLE,
  DuckDBDataChunk,
  DuckDBDateValue,
  DuckDBDecimalValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBUUIDValue,
  ENUM,
  FLOAT,
  HUGEINT,
  INTEGER,
  LIST,
  SMALLINT,
  TIMESTAMP_MS,
  TINYINT,
  UBIGINT,
  UINTEGER,
  USMALLINT,
  UTINYINT,
  UUID,
  VARCHAR,
  listValue,
} from "@duckdb/node-api";
import type { DuckDBType } from "@duckdb/node-api";

import {
  createDataChunkWriter,
  loadDuckChunkBindings,
} from "./create-data-chunk-writer.ts";

// Nulls around the uint64 validity word boundaries
const rowCount = 130;
const nullRows = new Set([0, 63, 64, 129]);

const columnsByType: [DuckDBType, (i: number) => unknown][] = [
  [BOOLEAN, (i) => i % 2 === 0],
  [TINYINT, (i) => (i % 256) - 128],
  [UTINYINT, (i) => i % 256],
  [SMALLINT, (i) => i * 250 - 32_768],
  [USMALLINT, (i) => i * 500],
  [INTEGER, (i) => (i - 65) * 33_000_000],
  [UINTEGER, (i) => i * 33_000_000],
  [BIGINT, (i) => BigInt(i - 65) * 70_000_000_000_000_000n],
  [UBIGINT, (i) => BigInt(i) * 140_000_000_000_000_000n],
  [FLOAT, (i) => i + 0.5],
  [DOUBLE, (i) => i / 3],
  [DATE, (i) => new DuckDBDateValue(i * 100 - 6000)],
  [
    TIMESTAMP_MS,
    (i) => new DuckDBTimestampMillisecondsValue(BigInt(i) * 86_400_123n),
  ],
  [
    DECIMAL(18, 3),
    (i) => new DuckDBDecimalValue(BigInt(i * 1001 - 50_000), 18, 3),
  ],
  [
    UUID,
    (i) =>
      DuckDBUUIDValue.fromUint128(
        BigInt("0x0198f9b06f4a7c338f7a8f2a9b6f1a10") * BigInt(i + 1)
      ),
  ],
  [ENUM(["a", "b", "c"]), (i) => ["a", "b", "c"][i % 3]],
  [VARCHAR, (i) => (i % 5 === 0 ? "" : `value-${i}-${"x".repeat(i % 20)}`)],
  [
    LIST(VARCHAR),
    (i) => listValue(Array.from({ length: i % 4 }, (_, j) => `s${i}-${j}`)),
  ],
  [LIST(BIGINT), (i) => listValue(i % 7 === 0 ? [] : [BigInt(i), null, -1n])],
  [
    LIST(LIST(INTEGER)),
    (i) => listValue([listValue([i, i + 1]), null, listValue([])]),
  ],
  // Not handled by the fast path, written by node-api
  [HUGEINT, (i) => BigInt(i) * 2n ** 100n],
  [DECIMAL(4, 1), (i) => new DuckDBDecimalValue(BigInt(i), 4, 1)],
];

const types = columnsByType.map(([t]) => t);
const columns = columnsByType.map(([, fn]) =>
  Array.from({ length: rowCount }, (_, i) => (nullRows.has(i) ? null : fn(i)))
);

const writeWith = (
  writer: ReturnType<typeof createDataChunkWriter>,
  cols: unknown[][]
) => {
  const chunk = DuckDBDataChunk.create(types);
  writer(chunk, cols);
  return chunk;
};

describe("createDataChunkWriter", () => {
  it("loads the node-api bindings", () => {
    expect(loadDuckChunkBindings()).not.toBeNull();
  });

  it("writes the same chunk as node-api setColumns", () => {
    const fast = writeWith(createDataChunkWriter(types), columns);
    const reference = writeWith(createDataChunkWriter(types, null), columns);
    expect(fast.rowCount).toBe(rowCount);
    expect(fast.getColumns()).toStrictEqual(reference.getColumns());
    // Sanity check of the reference itself
    expect(fast.getColumns()[5]!.slice(0, 3)).toStrictEqual([
      null,
      -2_112_000_000,
      -2_079_000_000,
    ]);
  });

  it("writes a chunk without nulls", () => {
    const noNulls = columnsByType.map(([, fn]) =>
      Array.from({ length: 10 }, (_, i) => fn(i + 1))
    );
    expect(
      writeWith(createDataChunkWriter(types), noNulls).getColumns()
    ).toStrictEqual(
      writeWith(createDataChunkWriter(types, null), noNulls).getColumns()
    );
  });

  it("uses chunk.setColumns when bindings are not available", () => {
    const chunk = DuckDBDataChunk.create(types);
    const spy = vi.spyOn(chunk, "setColumns");
    createDataChunkWriter(types, null)(chunk, columns);
    expect(spy).toHaveBeenCalledOnce();
  });

  it.each<[string, DuckDBType, unknown, string]>([
    ["int32 overflow", INTEGER, 2_147_483_648, "number out of int32 range"],
    ["non integer", INTEGER, 1.5, "number is not an integer"],
    ["int8 overflow", TINYINT, 128, "number out of int8 range"],
    ["int64 overflow", BIGINT, 2n ** 63n, "bigint out of int64 range"],
    ["negative uint64", UBIGINT, -1n, "bigint out of uint64 range"],
    ["unknown enum", ENUM(["a"]), "z", "is not a member"],
    ["list item overflow", LIST(INTEGER), listValue([2 ** 31]), "out of int32"],
    ["not a list", LIST(INTEGER), 1, "A list value was expected"],
  ])("throws on %s", (_label, type, value, message) => {
    const writer = createDataChunkWriter([type]);
    expect(() => writer(DuckDBDataChunk.create([type]), [[value]])).toThrow(
      message
    );
  });

  it("throws on column count or length mismatch", () => {
    const writer = createDataChunkWriter([INTEGER, INTEGER]);
    expect(() =>
      writer(DuckDBDataChunk.create([INTEGER, INTEGER]), [[1]])
    ).toThrow("Expected 2 columns, got 1");
    expect(() =>
      writer(DuckDBDataChunk.create([INTEGER, INTEGER]), [[1], [1, 2]])
    ).toThrow("number of values must equal chunk row count");
  });
});

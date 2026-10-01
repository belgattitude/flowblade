import { describe, expect, it } from "vitest";

import { rowsToConvertedColumnsChunks } from "./rows-to-converted-columns-chunks";

describe("rowsToConvertedColumnsChunks", () => {
  type Row = { id: number; name: string | null };

  async function* makeRows(rows: Row[]): AsyncGenerator<Row> {
    for (const r of rows) yield r;
  }

  const input: Row[] = [
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
    { id: 4, name: "D" },
    { id: 5, name: null },
  ];

  it("yields converted column arrays in columns order", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input),
      chunkSize: 2,
      columns: ["name", "id"],
      converters: { id: BigInt },
    });
    expect(await Array.fromAsync(gen)).toStrictEqual([
      [
        ["A", "B"],
        [1n, 2n],
      ],
      [
        ["C", "D"],
        [3n, 4n],
      ],
      [[null], [5n]],
    ]);
  });

  it("handles chunkSize = 1", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input.slice(0, 2)),
      chunkSize: 1,
      columns: ["id"],
      converters: {},
    });
    expect(await Array.fromAsync(gen)).toStrictEqual([[[1]], [[2]]]);
  });

  it("does not emit an empty final chunk when rows are multiple of chunkSize", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input.slice(0, 4)),
      chunkSize: 2,
      columns: ["id", "name"],
      converters: {},
    });
    const out = await Array.fromAsync(gen);
    expect(out.length).toBe(2);
    expect(out[1]).toStrictEqual([
      [3, 4],
      ["C", "D"],
    ]);
  });

  it("yields nothing for empty input", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows([]),
      chunkSize: 2,
      columns: ["id", "name"],
      converters: {},
    });
    expect(await Array.fromAsync(gen)).toStrictEqual([]);
  });

  it("supports sync generators", async () => {
    function* makeSyncRows(): Generator<Row> {
      yield* input.slice(0, 3);
    }
    const gen = rowsToConvertedColumnsChunks({
      rows: makeSyncRows(),
      chunkSize: 2,
      columns: ["id"],
      converters: { id: (v: number) => v * 10 },
    });
    expect(await Array.fromAsync(gen)).toStrictEqual([[[10, 20]], [[30]]]);
  });

  it("passes undefined to converters for missing keys and ignores extra keys", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows([
        { id: 1, name: "A", extra: true } as Row,
        { name: "B" } as Row,
      ]),
      chunkSize: 10,
      columns: ["id", "name"],
      converters: { id: (v: number | undefined) => v ?? null },
    });
    const out = await Array.fromAsync(gen);
    expect(out).toStrictEqual([
      [
        [1, null],
        ["A", "B"],
      ],
    ]);
  });

  it("throws when converters contain unknown columns", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input),
      chunkSize: 2,
      columns: ["id"],
      // @ts-expect-error testing unknown column
      converters: { nope: (v: unknown) => v },
    });
    await expect(Array.fromAsync(gen)).rejects.toThrow(
      "converters parameter contains unknown columns: nope"
    );
  });

  it("throws on invalid chunkSize", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input),
      chunkSize: 0,
      columns: ["id"],
      converters: {},
    });
    await expect(Array.fromAsync(gen)).rejects.toThrow(
      "chunkSize must be a positive integer, got 0"
    );
  });
});

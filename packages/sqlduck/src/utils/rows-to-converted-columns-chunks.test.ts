import { describe, expect, it, vi } from "vitest";

import {
  compileFillRow,
  rowsToConvertedColumnsChunks,
} from "./rows-to-converted-columns-chunks";

describe(rowsToConvertedColumnsChunks, () => {
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
    await expect(Array.fromAsync(gen)).resolves.toStrictEqual([
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
    await expect(Array.fromAsync(gen)).resolves.toStrictEqual([[[1]], [[2]]]);
  });

  it("does not emit an empty final chunk when rows are multiple of chunkSize", async () => {
    const gen = rowsToConvertedColumnsChunks({
      rows: makeRows(input.slice(0, 4)),
      chunkSize: 2,
      columns: ["id", "name"],
      converters: {},
    });
    const out = await Array.fromAsync(gen);
    expect(out).toHaveLength(2);
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
    await expect(Array.fromAsync(gen)).resolves.toStrictEqual([]);
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
    await expect(Array.fromAsync(gen)).resolves.toStrictEqual([
      [[10, 20]],
      [[30]],
    ]);
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

  describe.each([true, false])("with compile: %s", (compile) => {
    it("yields the same converted chunks", async () => {
      const gen = rowsToConvertedColumnsChunks({
        rows: makeRows(input),
        chunkSize: 2,
        columns: ["name", "id"],
        converters: { id: BigInt },
        compile,
      });
      await expect(Array.fromAsync(gen)).resolves.toStrictEqual([
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

    it("supports column names that are not valid identifiers", async () => {
      type OddRow = Record<string, unknown>;
      const keys = ['a"b', "c\\d", "e\nf", "]; throw 1; //", "\u2028"];
      const row = Object.fromEntries(keys.map((k, i) => [k, i]));
      async function* oddRows(): AsyncGenerator<OddRow> {
        yield row;
      }
      const gen = rowsToConvertedColumnsChunks<OddRow>({
        rows: oddRows(),
        chunkSize: 2,
        columns: keys,
        converters: { [keys[3]!]: (v: number) => v * 10 },
        compile,
      });
      await expect(Array.fromAsync(gen)).resolves.toStrictEqual([
        [[0], [1], [2], [30], [4]],
      ]);
    });
  });

  describe(compileFillRow, () => {
    it("compiles a row filler applying converters", () => {
      const fillRow = compileFillRow(
        ["a", "b"],
        [undefined, (v: number) => -v]
      );
      expect(fillRow).toBeInstanceOf(Function);
      const cols: unknown[][] = [[], []];
      fillRow!(cols, { a: 1, b: 2 }, 0);
      fillRow!(cols, { b: 3 }, 1);
      expect(cols).toStrictEqual([
        [1, undefined],
        [-2, -3],
      ]);
    });

    it("returns null for non-string columns", () => {
      expect(compileFillRow([Symbol("a")], [undefined])).toBeNull();
    });

    it("returns null when new Function is not allowed", () => {
      const original = globalThis.Function;
      // Simulates a CSP forbidding eval
      vi.spyOn(globalThis, "Function").mockImplementation(() => {
        throw new EvalError("Code generation from strings disallowed");
      });
      try {
        expect(compileFillRow(["a"], [undefined])).toBeNull();
      } finally {
        vi.restoreAllMocks();
      }
      expect(globalThis.Function).toBe(original);
    });
  });

  describe("signal", () => {
    it("throws the abort reason and closes rows when aborted mid-stream", async () => {
      const controller = new AbortController();
      let closed = false;
      async function* abortingRows(): AsyncGenerator<Row> {
        try {
          for (let id = 1; id <= 10; id++) {
            if (id === 4) {
              controller.abort(new Error("stop"));
            }
            yield { id, name: `n${id}` };
          }
        } finally {
          closed = true;
        }
      }
      const received: unknown[] = [];
      await expect(async () => {
        for await (const chunk of rowsToConvertedColumnsChunks({
          rows: abortingRows(),
          chunkSize: 3,
          columns: ["id", "name"],
          converters: {},
          signal: controller.signal,
        })) {
          received.push(chunk);
        }
      }).rejects.toThrow("stop");
      expect(received).toHaveLength(1);
      expect(closed).toBe(true);
    });

    it("throws without reading rows when already aborted", async () => {
      let pulled = false;
      async function* rows(): AsyncGenerator<Row> {
        pulled = true;
        yield { id: 1, name: "A" };
      }
      const gen = rowsToConvertedColumnsChunks({
        rows: rows(),
        chunkSize: 3,
        columns: ["id", "name"],
        converters: {},
        signal: AbortSignal.abort(),
      });
      await expect(Array.fromAsync(gen)).rejects.toThrow(
        expect.objectContaining({ name: "AbortError" })
      );
      expect(pulled).toBe(false);
    });

    it("yields all chunks when not aborted", async () => {
      const gen = rowsToConvertedColumnsChunks({
        rows: makeRows([{ id: 1, name: "A" }]),
        chunkSize: 3,
        columns: ["id", "name"],
        converters: {},
        signal: new AbortController().signal,
      });
      await expect(Array.fromAsync(gen)).resolves.toHaveLength(1);
    });
  });
});

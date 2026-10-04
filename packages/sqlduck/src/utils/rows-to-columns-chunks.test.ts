import { describe, expect, expectTypeOf, it } from "vitest";

import { rowsToColumnsChunks } from "./rows-to-columns-chunks";

describe("rowsToColumnsChunk", () => {
  type Row = { id: number; name: string | null };

  async function* makeRows(rows: Row[]): AsyncGenerator<Row> {
    for (const r of rows) yield r;
  }

  it("yields column chunks according to chunkSize", async () => {
    const input: Row[] = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
      { id: 4, name: "D" },
      { id: 5, name: null },
    ];

    const gen = rowsToColumnsChunks({
      rows: makeRows(input),
      chunkSize: 2,
    });
    const out = await Array.fromAsync(gen);
    expectTypeOf(out).toEqualTypeOf<
      { id: number[]; name: (string | null)[] }[]
    >();

    expect(out).toHaveLength(3);
    expect(out[0]).toStrictEqual({
      id: [1, 2],
      name: ["A", "B"],
    });
    expect(out[1]).toStrictEqual({
      id: [3, 4],
      name: ["C", "D"],
    });
    expect(out[2]).toStrictEqual({
      id: [5],
      name: [null],
    });
  });

  it("handles chunkSize = 1 without merging rows", async () => {
    const input: Row[] = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
    ];

    const gen = rowsToColumnsChunks({
      rows: makeRows(input),
      chunkSize: 1,
    });
    const out = await Array.fromAsync(gen);

    expect(out).toStrictEqual([
      { id: [1], name: ["A"] },
      { id: [2], name: ["B"] },
      { id: [3], name: ["C"] },
    ]);
  });

  it("does not emit an empty final chunk when rows are multiple of chunkSize", async () => {
    const input: Row[] = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
      { id: 4, name: "D" },
    ];

    const gen = rowsToColumnsChunks({
      rows: makeRows(input),
      chunkSize: 2,
    });
    const out = await Array.fromAsync(gen);

    expect(out).toStrictEqual([
      { id: [1, 2], name: ["A", "B"] },
      { id: [3, 4], name: ["C", "D"] },
    ]);
  });

  it("yields nothing for empty input", async () => {
    const gen = rowsToColumnsChunks<Row>({
      rows: makeRows([]),
      chunkSize: 3,
    });
    const out = await Array.fromAsync(gen);
    expect(out).toHaveLength(0);
  });

  it("throws an error if transformers contains keys not present in the row", async () => {
    const input: Row[] = [{ id: 1, name: "A" }];

    const gen = rowsToColumnsChunks({
      rows: makeRows(input),
      chunkSize: 1,
      transformers: {
        id: (v: number) => v.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        not_exists: (v: any) => v,
      } as any,
    });

    await expect(Array.fromAsync(gen)).rejects.toThrow(
      "transformers parameter contains unknown row ids: not_exists"
    );
  });

  it("properly infers the transformer function return type", async () => {
    const input: Row[] = [{ id: 1, name: "A" }];

    const gen = rowsToColumnsChunks({
      rows: makeRows(input),
      chunkSize: 1,
      transformers: {
        id: (v: number) => v.toString(),
      },
    });
    const out = await Array.fromAsync(gen);

    expectTypeOf(out).toEqualTypeOf<
      { id: string[]; name: (string | null)[] }[]
    >();

    expect(out[0]).toStrictEqual({
      id: ["1"],
      name: ["A"],
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
        for await (const chunk of rowsToColumnsChunks({
          rows: abortingRows(),
          chunkSize: 3,
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
      const gen = rowsToColumnsChunks({
        rows: rows(),
        chunkSize: 3,
        signal: AbortSignal.abort(),
      });
      await expect(Array.fromAsync(gen)).rejects.toThrow(
        expect.objectContaining({ name: "AbortError" })
      );
      expect(pulled).toBe(false);
    });

    it("yields all chunks when not aborted", async () => {
      const gen = rowsToColumnsChunks({
        rows: makeRows([{ id: 1, name: "A" }]),
        chunkSize: 3,
        signal: new AbortController().signal,
      });
      await expect(Array.fromAsync(gen)).resolves.toHaveLength(1);
    });
  });
});

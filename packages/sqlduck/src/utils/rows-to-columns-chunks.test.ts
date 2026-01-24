import { describe, expect, it } from 'vitest';

import { rowsToColumnsChunks } from './rows-to-columns-chunks';

type Row = { id: string; name: string };

async function* makeRows(rows: Row[]): AsyncGenerator<Row> {
  for (const r of rows) {
    yield r;
  }
}

describe('rowsToColumnsChunk', () => {
  type Row = { id: string; name: string };

  async function* makeRows(rows: Row[]): AsyncGenerator<Row> {
    for (const r of rows) yield r;
  }

  it('yields column chunks according to chunkSize', async () => {
    const input: Row[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
      { id: '5', name: 'E' },
    ];

    const gen = rowsToColumnsChunks<Row>(makeRows(input), 2);
    const out = await Array.fromAsync(gen);

    expect(out.length).toBe(3);
    expect(out[0]).toStrictEqual([
      ['1', '2'],
      ['A', 'B'],
    ]);
    expect(out[1]).toStrictEqual([
      ['3', '4'],
      ['C', 'D'],
    ]);
    expect(out[2]).toStrictEqual([['5'], ['E']]);
  });

  it('handles chunkSize = 1 without merging rows', async () => {
    const input: Row[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];

    const gen = rowsToColumnsChunks<Row>(makeRows(input), 1);
    const out = await Array.fromAsync(gen);

    expect(out).toStrictEqual([
      [['1'], ['A']],
      [['2'], ['B']],
      [['3'], ['C']],
    ]);
  });

  it('does not emit an empty final chunk when rows are multiple of chunkSize', async () => {
    const input: Row[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
    ];

    const gen = rowsToColumnsChunks<Row>(makeRows(input), 2);
    const out = await Array.fromAsync(gen);

    expect(out).toStrictEqual([
      [
        ['1', '2'],
        ['A', 'B'],
      ],
      [
        ['3', '4'],
        ['C', 'D'],
      ],
    ]);
  });

  it('yields nothing for empty input', async () => {
    const gen = rowsToColumnsChunks<Row>(makeRows([]), 3);
    const out = await Array.fromAsync(gen);
    expect(out.length).toBe(0);
  });
});

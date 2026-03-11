import { expectTypeOf } from 'vitest';

import { rowsToColumnarChunks2 } from './rows-to-columnar-chunks2.ts';

describe('rowsToColumnarChunks2', () => {
  describe('when a valid row stream is provided', () => {
    type Row = { id: number; name: string; email: string };

    async function* getRowStream(): AsyncGenerator<Row> {
      yield { id: 1, name: 'A', email: 'c' };
      yield { id: 2, name: 'B', email: 'c' };
      yield { id: 3, name: 'C', email: 'c' };
    }

    const chunkedColumnStream = rowsToColumnarChunks2({
      rows: getRowStream(),
      chunkSize: 2,
      columns: ['name', 'id'],
    });

    it('should transpose a row stream', async () => {
      const firstChunk = await chunkedColumnStream.next();

      expect(firstChunk.done).toStrictEqual(false);
      expect(firstChunk.value).toStrictEqual({
        id: [1, 2],
        name: ['A', 'B'],
      });
      expect(Object.keys(firstChunk.value)).toStrictEqual(['name', 'id']);
      expect(Object.keys(firstChunk.value)).not.toStrictEqual(['id', 'name']);
      expect(firstChunk.done).toBe(false);
      const secondChunk = await chunkedColumnStream.next();
      expect(secondChunk.value).toStrictEqual({
        id: [3],
        name: ['C'],
      });
      expect(secondChunk.done).toBe(false);
      const thirdChunk = await chunkedColumnStream.next();
      expect(thirdChunk.done).toBe(true);
      expect(thirdChunk.value).toStrictEqual(undefined);

      if (firstChunk.done === false) {
        expectTypeOf(firstChunk.value).toEqualTypeOf<{
          id: number[];
          name: string[];
        }>();
      }
    });
    it('should type correctly the return', async () => {
      const firstChunk = await chunkedColumnStream.next();
      if (firstChunk.done === false) {
        expectTypeOf(firstChunk.value).toEqualTypeOf<{
          id: number[];
          name: string[];
        }>();
      }
    });
  });

  describe('when an empty stream is provided', () => {
    type Row = { id: number; name: string };
    async function* getRowStream(): AsyncGenerator<Row> {}

    const chunkedColumnStream = rowsToColumnarChunks2({
      rows: getRowStream(),
      chunkSize: 2,
    });

    it('should return undefined', async () => {
      const firstChunk = await chunkedColumnStream.next();
      expect(firstChunk.value).toStrictEqual(undefined);
      expect(firstChunk.done).toBe(true);
    });
  });
});

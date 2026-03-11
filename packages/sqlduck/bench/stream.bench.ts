import isInCi from 'is-in-ci';
import { bench, describe } from 'vitest';
import * as z from 'zod';

import { rowsToColumnarChunks } from '../src/utils/rows-to-columnar-chunks.ts';
import { rowsToColumnsChunks } from '../src/utils/rows-to-columns-chunks';
import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator';

const benchConfig = {
  iterations: isInCi ? 3 : 7,
  throws: true,
};

describe(`Bench stream`, async () => {
  const conn = await createDuckdbTestMemoryDb({
    // Keep it high to prevent going to .tmp directory
    max_memory: isInCi ? '128M' : '256M',
    threads: 1,
  });

  const dbName = 'memory_db';
  // Arrange
  await conn.run(
    `ATTACH IF NOT EXISTS ':memory:' AS ${dbName} (COMPRESS 'true')`
  );

  const userSchema = z.object({
    id: z.number().meta({ description: 'cool' }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(z.bigint()),
  });

  const limit = isInCi ? 10_000 : 1_000_000;

  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: userSchema,
    factory: ({ rowIdx }) => {
      return {
        id: 0,
        name: `name-${rowIdx}`,
        email: `email-${rowIdx}@example.com`.repeat(10),
        bignumber: 0n,
      };
    },
  });

  async function* mapFakeRowStream(
    stream: ReturnType<typeof getFakeRowStream>
  ): AsyncIterableIterator<z.input<typeof userSchema>> {
    for await (const row of stream) {
      yield {
        ...row,
        bignumber: 1n,
      };
    }
  }

  bench(
    `rowToColumnsChunk with chunkSize 2048 (count: ${limit})`,
    async () => {
      const chunkSize = 2048;
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
      });
      const first = (await a.next()) as unknown as {
        value: [number[], string[], string[], (bigint | null)[]];
      };

      const bigNumberColumn = first.value[3];
      if (bigNumberColumn[0]! !== 0n) {
        throw new Error('Expected 0n');
      }
      if (bigNumberColumn.length !== chunkSize) {
        throw new Error(
          `Expected ${chunkSize} rows, got ${bigNumberColumn.length}`
        );
      }
    },
    benchConfig
  );

  bench(
    `mapFakeRowStream with chunkSize 2048 (count: ${limit})`,
    async () => {
      const a = rowsToColumnsChunks({
        rows: mapFakeRowStream(getFakeRowStream()),
        chunkSize: 2048,
      });
      for await (const row of a) {
        const _a = row;
      }
    },
    benchConfig
  );
  bench(
    `rowsToColumnarChunks with chunkSize 2048 (count: ${limit})`,
    async () => {
      const chunkSize = 2048;
      const chunkedColsStream = rowsToColumnarChunks({
        rows: getFakeRowStream(),
        chunkSize,
      });
      const first = await chunkedColsStream.next();
      if (first.done) throw new Error('Expected rows');
      const colBigNumberValues = first.value.bignumber;
      const firstBigNumberValue = colBigNumberValues[0]!;
      if (firstBigNumberValue !== 0n) {
        throw new Error(`Expected 0n, received ${firstBigNumberValue} instead`);
      }
      if (colBigNumberValues.length !== chunkSize) {
        throw new Error(
          `Expected ${chunkSize} rows, got ${colBigNumberValues.length}`
        );
      }
    },
    benchConfig
  );
});

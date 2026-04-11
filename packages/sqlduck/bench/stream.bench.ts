import isInCi from 'is-in-ci';
import { bench, type BenchOptions, describe } from 'vitest';
import * as z from 'zod';

import { rowsToColumnsChunks } from '../src/utils/rows-to-columns-chunks';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator';

const benchConfig: BenchOptions = {
  iterations: isInCi ? 1 : 10,
  warmupIterations: isInCi ? 1 : 1,
  throws: true,
};

describe(`Bench rowsToColumnsChunks`, async () => {
  const userSchema = z.object({
    id: z.number().meta({ description: 'cool' }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(z.bigint()),
  });

  const limit = isInCi ? 1000 : 100_000;

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
      for await (const row of a) {
        const _a = row;
      }
    },
    benchConfig
  );

  bench(
    `rowToColumnsChunk with transformer with chunkSize 2048 (count: ${limit})`,
    async () => {
      const chunkSize = 2048;
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize,
      });
      for await (const row of a) {
        const _a = row;
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
});

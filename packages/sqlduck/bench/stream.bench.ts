import { DuckdbDatasource } from '@flowblade/source-duckdb';
import isInCi from 'is-in-ci';
import { bench, describe } from 'vitest';
import * as z from 'zod';

import { rowsToColumnsChunks } from '../src/utils/rows-to-columns-chunks';
import { zodCodecs } from '../src/utils/zod-codecs';
import { createDuckdbTestMemoryDb } from '../tests/e2e/utils/create-duckdb-test-memory-db';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator';

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
  const ds = new DuckdbDatasource({
    connection: conn,
  });

  const userSchema = z.object({
    id: z.number().meta({ description: 'cool' }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(zodCodecs.bigintToString),
  });

  const limit = isInCi ? 10_000 : 1_000_000;

  const getFakeRowStream = createFakeRowsAsyncIterator({
    count: limit,
    schema: userSchema,
    factory: ({ rowIdx }) => {
      return {
        id: rowIdx,
        name: `name-${rowIdx}`,
        email: `email-${rowIdx}@example.com`.repeat(10),
        bignumber: 0n,
      };
    },
  });

  const fakeRowStream = getFakeRowStream();

  async function* mapFakeRowStream(
    stream: typeof fakeRowStream
  ): AsyncIterableIterator<z.input<typeof userSchema>> {
    for await (const row of stream) {
      yield {
        ...row,
        bignumber: 1n,
        // hello: 'world'.repeat(2304),
      };
    }
  }

  bench('rowToColumnsChunk with chunkSize 2048', async () => {
    const a = rowsToColumnsChunks(getFakeRowStream(), 2048);
    for await (const row of a) {
      const _a = row;
      // console.log(a, _a);
    }
  });

  bench('mapFakeRowStream with chunkSize 2048', async () => {
    const a = rowsToColumnsChunks(mapFakeRowStream(getFakeRowStream()), 2048);
    for await (const row of a) {
      const _a = row;
      // console.log(a, _a);
    }
  });
});

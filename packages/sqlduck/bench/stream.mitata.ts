import isInCi from 'is-in-ci';
import { bench, boxplot, run, summary } from 'mitata';
import * as z from 'zod';

import { rowsToColumnsChunks } from '../src/utils/rows-to-columns-chunks.ts';
import { zodCodecs } from '../src/utils/zod-codecs.ts';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator.ts';

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
      email: `email-${rowIdx}@example.com`.repeat(150),
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
    };
  }
}

boxplot(() => {
  summary(() => {
    bench('stream', async () => {
      const a = rowsToColumnsChunks(getFakeRowStream(), 2048);
      for await (const row of a) {
        const _a = row;
      }
    }).gc('inner');
    bench('stream with mapper 2048', async () => {
      const a = rowsToColumnsChunks(mapFakeRowStream(getFakeRowStream()), 2048);
      for await (const row of a) {
        const _a = row;
        // console.log(a, _a);
      }
    }).gc('inner');
    bench('stream with mapper 1024', async () => {
      const a = rowsToColumnsChunks(mapFakeRowStream(getFakeRowStream()), 1024);
      for await (const row of a) {
        const _a = row;
        // console.log(a, _a);
      }
    }).gc('inner');
  });
});

await run();

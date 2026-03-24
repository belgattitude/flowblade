import isInCi from 'is-in-ci';
import { bench, boxplot, do_not_optimize, run, summary } from 'mitata';
import * as z from 'zod';

import { rowsToColumnsChunks } from '../src/utils/rows-to-columns-chunks.ts';
import { zodCodecs } from '../src/utils/zod-codecs.ts';
import { createFakeRowsAsyncIterator } from '../tests/utils/create-fake-rows-iterator.ts';

const userSchema = z.object({
  id: z.number().meta({ description: 'cool' }),
  name: z.string(),
  email: z.email().nullable(),
  bignumber: zodCodecs.bigintToString,
});

const limit = isInCi ? 10_000 : 100_000;
const email = `email@example.com`.repeat(400);
const getFakeRowStream = createFakeRowsAsyncIterator({
  count: limit,
  schema: userSchema,
  factory: ({ rowIdx }) => {
    return {
      id: rowIdx,
      name: `name-${rowIdx}`,
      email: email,
      bignumber: BigInt(rowIdx),
    };
  },
});

async function* mapFakeRowStream(
  stream: ReturnType<typeof getFakeRowStream>
): AsyncIterableIterator<z.output<typeof userSchema>> {
  for await (const row of stream) {
    row.bignumber = row.bignumber + 1n;
    yield row;
  }
}

boxplot(() => {
  summary(() => {
    bench('stream', async () => {
      const a = rowsToColumnsChunks({
        rows: getFakeRowStream(),
        chunkSize: 2048,
      });
      let count = 0;
      for await (const row of a) {
        count += row[0]!.length;
      }
      if (count !== limit)
        throw new Error(
          `Expected ${limit} rows, got ${count} rows from stream`
        );
      return do_not_optimize(count);
    }).gc('inner');
    bench('stream with mapper 2048', async () => {
      const fakeRowStream = getFakeRowStream();
      const a = rowsToColumnsChunks({
        rows: mapFakeRowStream(fakeRowStream),
        chunkSize: 2048,
      });
      let count = 0;
      for await (const row of a) {
        count += row[0]!.length;
      }
      if (count !== limit)
        throw new Error(
          `Expected ${limit} rows, got ${count} rows from stream`
        );
      return do_not_optimize(count);
    }).gc('inner');

    bench('stream with mapper 1024', async () => {
      const fakeRowStream = getFakeRowStream();

      const a = rowsToColumnsChunks({
        rows: mapFakeRowStream(fakeRowStream),
        chunkSize: 1024,
      });
      let count = 0;

      for await (const row of a) {
        count += row[0]!.length;
      }
      if (count !== limit)
        throw new Error(
          `Expected ${limit} rows, got ${count} rows from stream`
        );
      return do_not_optimize(count);
    }).gc('inner');
  });
});

await run({ throw: true });

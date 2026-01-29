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

function mapFakeRowStreamChunked(
  stream: ReturnType<typeof getFakeRowStream>,
  chunkSize = 2048
): ReadableStream<z.output<typeof userSchema>> {
  const readableStream = ReadableStream.from(stream);

  const { readable, writable } = new TransformStream<
    z.output<typeof userSchema>,
    z.output<typeof userSchema>
  >(
    {
      transform(row, controller) {
        // Mutate in-place to avoid allocation
        row.bignumber = row.bignumber + 1n;
        controller.enqueue(row);
      },
    },
    {
      highWaterMark: chunkSize,
    }
  );

  void readableStream.pipeTo(writable);
  return readable;
}

async function* rowsToColumnsChunksFromReader<
  T extends Record<string, unknown>,
>(
  stream: ReadableStream<T>,
  chunkSize: number
): AsyncGenerator<unknown[][], void, unknown> {
  const reader = stream.getReader();
  let buffer: T[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value !== undefined) {
        buffer.push(value);
      }

      // Yield when buffer reaches chunk size or stream ends
      if (buffer.length >= chunkSize || (done && buffer.length > 0)) {
        // Extract columns from buffered rows
        const columns: unknown[][] = [];
        const keys = Object.keys(buffer[0]!);

        for (const key of keys) {
          columns.push(buffer.map((row) => row[key]));
        }

        yield columns;
        buffer = [];
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

boxplot(() => {
  summary(() => {
    bench('stream', async () => {
      const a = rowsToColumnsChunks(getFakeRowStream(), 2048);
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
      const a = rowsToColumnsChunks(mapFakeRowStream(fakeRowStream), 2048);
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

    bench('stream with web transform', async () => {
      const readable = mapFakeRowStreamChunked(getFakeRowStream(), 2048);
      const a = rowsToColumnsChunksFromReader(readable, 2048);
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

      const a = rowsToColumnsChunks(mapFakeRowStream(fakeRowStream), 1024);
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

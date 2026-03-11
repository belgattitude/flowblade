import { DuckDBDateValue } from '@duckdb/node-api';
import * as z from 'zod';

import { getDuckdbColumnTypesFromZod } from '../table/get-duckdb-column-types-from-zod.ts';
import { rowStreamToDuckDbAppender } from './row-stream-to-duckdb-appender.ts';

const userSchema = z.object({
  id: z.int32(),
  name: z.nullable(z.string()),
  updated_at: z.nullable(z.iso.date()),
});

type Row = z.infer<typeof userSchema>;

const createRow = (idx: number, overrides?: Partial<Row>) => {
  const row = {
    id: idx,
    name: `name-${idx}`,
    updated_at: '2026-01-01',
    ignored: '_',
  };
  return { ...row, ...overrides };
};

describe('rowsStreamToDuckDbAppender', () => {
  describe('when a valid row stream is provided', async () => {
    async function* getStreamFromDb(): AsyncGenerator<
      Row & {
        ignored: string;
      }
    > {
      yield createRow(1);
      yield createRow(2, { name: null });
      yield createRow(3, { updated_at: null });
    }

    const duckdbChunkStream = rowStreamToDuckDbAppender({
      rows: getStreamFromDb(),
      chunkSize: 2,
      columnTypes: getDuckdbColumnTypesFromZod({
        schema: userSchema,
      }),
    });

    const first = await duckdbChunkStream.next();
    if (first.done) throw new Error('Expected a value');
    expect(first.value).toStrictEqual([
      [1, 2],
      ['name-1', null],
      [new DuckDBDateValue(1), null],
    ]);
  });
});

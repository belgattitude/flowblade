// type SupportedRowTypes = string | number | boolean | Date | bigint | null;

// import type { DuckdbColumnTypeMap } from '../table/get-table-create-from-zod.ts';
/*
type SupportedRowTypes = unknown;

type RowStreamToDuckDbAppenderParams<
  TRow extends Record<string, SupportedRowTypes>,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
  columnTypes: TColumns;
};
*/

/**
 * Transform a row stream into a columnar stream of chunks.
 *
 * @example
 * ```typescript
 * import { DuckDBDateValue } from '@duckdb/node-api';
 * import * as z from 'zod';
 *
 * import { getDuckdbColumnTypesFromZod } from '../table/get-duckdb-column-types-from-zod.ts';
 *
 * const userSchema = z.object({
 *   id: z.int32(),
 *   name: z.nullable(z.string()),
 *   updated_at: z.nullable(z.iso.date()),
 * });
 *
 * type Row = z.infer<typeof userSchema>;
 *
 * async function* getStreamFromDb(): AsyncGenerator<Partial<Row>> {
 *   yield { id: 1, name: 'A', updated_at: '2026-12-31', 'ignored': '_' };
 *   yield { name: 'B', id: 2, updated_at: '2026-12-31', 'ignored': '_' };
 *   yield { id: 3, updated_at: '2026-12-31', name: 'C', 'ignored': '_' };
 * }
 *
 * const columnTypes = getDuckdbColumnTypesFromZod({ schema: userSchema })
 *
 * const chunkedDataframes = rowStreamToDuckDbAppender({
 *  rows: getStreamFromDb(),
 *  chunkSize: 2,
 *  columnTypes: getDuckdbColumnTypesFromZod({
 *    schema: userSchema,
 *  }),
 * });
 *
 * const firstChunk = await chunkedDataframes.next();
 * expect(first.value).toStrictEqual([
 *   [1, 2],
 *   ['A', null],
 *   [new DuckDBDateValue(1), null],
 * ]);
 * ```
 */
export async function* rowStreamToDuckDbAppender3<
  TRow extends Record<string, SupportedRowTypes>,
>(
  params: RowStreamToDuckDbAppenderParams<TRow>
): AsyncIterableIterator<TRow[keyof TRow][][]> {
  const { rows, chunkSize } = params;
}

import type { DuckDBTypeId, DuckDBValue } from '@duckdb/node-api';
import { DuckDBTimestampValue } from '@duckdb/node-api';

type SupportedRowTypes = unknown;

type DuckdbColumnTypeMap<TKeys extends string> = Record<TKeys, DuckDBTypeId>;

type RowStreamToDuckDbAppenderParams<
  TRow extends Record<string, SupportedRowTypes>,
  TColumns extends DuckdbColumnTypeMap<Exclude<keyof TRow, symbol | number>>,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
  columnTypes: TColumns;
};

const convertValue = (value: unknown, duckDbType: DuckDBTypeId): unknown => {
  if (value === undefined || value === null) return null;

  if (value instanceof Date) {
    return new DuckDBTimestampValue(BigInt(value.getTime() * 1000));
  }
  if (value instanceof BigInt) {
    return value.toString(10);
  }
  return value === undefined ? null : (value as DuckDBValue);
};

export async function* rowStreamToDuckDbAppender<
  TRow extends Record<string, SupportedRowTypes>,
  TColumns extends DuckdbColumnTypeMap<Exclude<keyof TRow, symbol | number>>,
>(
  params: RowStreamToDuckDbAppenderParams<TRow, TColumns>
): AsyncIterableIterator<unknown[][]> {
  const { rows, chunkSize, columnTypes } = params;
  const columns = Object.keys(columnTypes) as (keyof TColumns & string)[];

  if (chunkSize <= 0) {
    return;
  }

  let chunk: unknown[][] = columns.map(() => []);
  let count = 0;

  for await (const row of rows as AsyncIterable<TRow>) {
    for (const [i, key] of columns.entries()) {
      const duckDbType = columnTypes[key];
      const value = convertValue(row[key], duckDbType);
      chunk[i]!.push(value);
    }

    count++;

    if (count >= chunkSize) {
      yield chunk;
      chunk = columns.map(() => []);
      count = 0;
    }
  }

  if (count > 0) {
    yield chunk;
  }
}

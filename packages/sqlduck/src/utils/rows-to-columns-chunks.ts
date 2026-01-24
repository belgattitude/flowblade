import { DuckDBTimestampValue, type DuckDBValue } from '@duckdb/node-api';

const toDuckValue = (value: unknown): DuckDBValue => {
  if (value instanceof Date) {
    return new DuckDBTimestampValue(BigInt(value.getTime() * 1000));
  }
  return value === undefined ? null : (value as DuckDBValue);
};

/**
 * Similar to `rowsToColumns` but yields results in chunks to avoid buffering
 * the entire dataset in memory. Each yielded item is a columns array for up to
 * `chunkSize` rows.
 *
 * Example for chunkSize = 2:
 *   input rows: [{id:'1',name:'A'}, {id:'2',name:'B'}, {id:'3',name:'C'}]
 *   yields: [[['1','2'], ['A','B']], [['3'], ['C']]]
 */
export async function* rowsToColumnsChunks<
  TRow extends Record<string, unknown>,
>(
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>,
  chunkSize: number
): AsyncIterableIterator<TRow[keyof TRow][][]> {
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
  }

  // Pull the first row to determine column order
  const first = await rows.next();
  if (first.done) return; // empty input → yield nothing

  const keys = Object.keys(first.value) as (keyof TRow)[];
  let columns: TRow[keyof TRow][][] = keys.map(() => []);
  let rowsInChunk = 0;

  // push first row values
  // @ts-expect-error find time to decide
  keys.forEach((k, i) => columns[i]!.push(toDuckValue(first.value[k])));
  rowsInChunk++;
  // In case chunkSize === 1 (or generally if threshold already reached),
  // flush immediately after the first row to avoid off-by-one errors.
  if (rowsInChunk >= chunkSize) {
    yield columns;
    columns = keys.map(() => []);
    rowsInChunk = 0;
  }

  // consume the rest
  for await (const row of rows) {
    // @ts-expect-error find time to decide
    keys.forEach((k, i) => columns[i]!.push(toDuckValue(row[k])));
    rowsInChunk++;
    if (rowsInChunk >= chunkSize) {
      yield columns;
      columns = keys.map(() => []);
      rowsInChunk = 0;
    }
  }

  if (rowsInChunk > 0) {
    yield columns;
  }
}

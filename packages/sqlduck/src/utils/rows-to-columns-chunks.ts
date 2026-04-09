import type { ValueMapperFn } from '../converter/create-duck-column-converters.ts';

// type SupportedRowTypes = string | number | boolean | Date | bigint | null;
type SupportedRowTypes = unknown;

type RowsToColumnsChunksParams<TRow extends Record<string, SupportedRowTypes>> =
  {
    rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
    chunkSize: number;
    transformers?: Map<keyof TRow, ValueMapperFn>;
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
  TRow extends Record<string, SupportedRowTypes>,
>(
  params: RowsToColumnsChunksParams<TRow>
): AsyncIterableIterator<TRow[keyof TRow][][]> {
  const { rows, chunkSize, transformers } = params;
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
  }

  // Pull the first row to determine column order
  const first = await rows.next();
  if (first.done) return; // empty input → yield nothing

  const keys = Object.keys(first.value) as (keyof TRow)[];
  let columns: TRow[keyof TRow][][] = keys.map(() => []);
  let rowsInChunk = 0;

  keys.forEach((k, i) => {
    // push first row values
    const fn = transformers?.get(k);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    columns[i]!.push(fn === undefined ? first.value[k] : fn(first.value[k]));
  });
  rowsInChunk++;
  // In case chunkSize === 1 (or generally if the threshold already reached),
  // flush immediately after the first row to avoid off-by-one errors.
  if (rowsInChunk >= chunkSize) {
    yield columns;
    columns = keys.map(() => []);
    rowsInChunk = 0;
  }

  // consume the rest
  for await (const row of rows) {
    keys.forEach((k, i) => {
      const fn = transformers?.get(k);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      columns[i]!.push(fn === undefined ? row[k] : fn(row[k]));
    });
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

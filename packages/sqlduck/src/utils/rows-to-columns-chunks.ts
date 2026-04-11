import type { ValueMapperFn } from '../converter/create-duck-column-converters.ts';

// type SupportedRowTypes = string | number | boolean | Date | bigint | null;
type SupportedRowTypes = unknown;

type RowsToColumnsChunksParams<
  TRow extends Record<string, SupportedRowTypes>,
  TTransformers extends Partial<Record<keyof TRow, ValueMapperFn>> = Partial<
    Record<keyof TRow, ValueMapperFn>
  >,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
  transformers?: TTransformers;
};

/**
 * Transform an async stream of rows into an async iterable of column arrays.
 *
 * It yields results in chunks to avoid buffering the entire dataset in memory. Each yielded item is a columns array for up to
 * `chunkSize` rows.
 *
 * @example
 * ```typescript
 *  async function* generateRows() {
 *    yield { id: 1, name: 'A' };
 *    yield { id: 2, name: 'B' };
 *    yield { id: 3, name: 'C' };
 *  }
 *
 *  const columnChunks = rowsToColumnsChunks({
 *    rows: generateRows(),
 *    chunkSize: 2,
 *  })
 *
 * for await (const chunk of columnChunks) {
 *   console.log(chunk);
 * }
 * // log: { id: [1, 2], name: ['A', 'B'] } // first chunk
 * // log: { id: [3], name: ['C'] } // second chunk
 * ```
 */
export async function* rowsToColumnsChunks<
  TRow extends Record<string, SupportedRowTypes>,
  TTransformers extends Partial<Record<keyof TRow, ValueMapperFn>> = Partial<
    Record<keyof TRow, ValueMapperFn>
  >,
>(
  params: RowsToColumnsChunksParams<TRow, TTransformers>
): AsyncIterableIterator<{
  [K in keyof TRow]: TTransformers[K] extends ValueMapperFn<any, infer TOut>
    ? TOut[]
    : TRow[K][];
}> {
  type TReturn = {
    [K in keyof TRow]: TTransformers[K] extends ValueMapperFn<any, infer TOut>
      ? TOut[]
      : TRow[K][];
  };
  const { rows, chunkSize, transformers } = params;
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
  }

  // Pull the first row to determine column order
  const first = await rows.next();
  if (first.done) return; // empty input → yield nothing

  const keys = Object.keys(first.value) as (keyof TRow)[];

  if (transformers !== undefined) {
    const transformerKeys = Object.keys(transformers);
    const unknownKeys = transformerKeys.filter(
      (k) => !keys.includes(k as keyof TRow)
    );
    if (unknownKeys.length > 0) {
      throw new Error(
        `transformers parameter contains unknown row ids: ${unknownKeys.join(', ')}`
      );
    }
  }

  function createColumns() {
    return Object.fromEntries(keys.map((k) => [k, []])) as unknown as TReturn;
  }

  let columns = createColumns();
  let rowsInChunk = 0;

  keys.forEach((k) => {
    // push first row values
    const fn = transformers?.[k];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    columns[k].push(fn === undefined ? first.value[k] : fn(first.value[k]));
  });
  rowsInChunk++;
  // In case chunkSize === 1 (or generally if the threshold already reached),
  // flush immediately after the first row to avoid off-by-one errors.
  if (rowsInChunk >= chunkSize) {
    yield columns;
    columns = createColumns();
    rowsInChunk = 0;
  }

  // consume the rest
  for await (const row of rows) {
    keys.forEach((k) => {
      const fn = transformers?.[k];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      columns[k].push(fn === undefined ? row[k] : fn(row[k]));
    });
    rowsInChunk++;
    if (rowsInChunk >= chunkSize) {
      yield columns;
      columns = createColumns();
      rowsInChunk = 0;
    }
  }

  if (rowsInChunk > 0) {
    yield columns;
  }
}

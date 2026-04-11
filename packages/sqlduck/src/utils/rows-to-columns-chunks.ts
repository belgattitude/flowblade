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
 * Converts a stream of rows (row-oriented) into a stream of column-oriented chunks.
 *
 * This function processes row data incrementally using an async generator, which prevents
 * loading the entire dataset into memory. Each yielded chunk is an object where keys are
 * column names and values are arrays of up to `chunkSize` elements.
 *
 * This is particularly useful for DuckDB's Appender API or other columnar processing
 * engines that expect data in chunks of columns.
 *
 * @param params - Configuration for the transformation.
 * @param params.rows - An async or sync iterable of rows.
 * @param params.chunkSize - The maximum number of rows per yielded chunk. Must be a positive integer.
 * @param params.transformers - Optional mappers for specific columns to transform values before chunking.
 *
 * @returns An async iterator yielding chunks of column-oriented data.
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
 * // Output:
 * // { id: [1, 2], name: ['A', 'B'] } // first chunk
 * // { id: [3], name: ['C'] } // second chunk
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
  [K in keyof TRow]: TTransformers[K] extends ValueMapperFn<
    infer _TIn,
    infer TOut
  >
    ? TOut[]
    : TRow[K][];
}> {
  type TReturn = {
    [K in keyof TRow]: TTransformers[K] extends ValueMapperFn<
      infer _TIn,
      infer TOut
    >
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
  const numKeys = keys.length;

  // eslint-disable-next-line unicorn/no-new-array
  const mappers = new Array<ValueMapperFn | undefined>(numKeys);
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
    for (let i = 0; i < numKeys; i++) {
      mappers[i] = transformers[keys[i]];
    }
  }

  function createColumns() {
    const obj = {} as TReturn;
    for (let i = 0; i < numKeys; i++) {
      const k = keys[i];
      // @ts-expect-error - obj starts empty
      obj[k] = [];
    }
    return obj;
  }

  let columns = createColumns();
  let rowsInChunk = 0;

  for (let i = 0; i < numKeys; i++) {
    const k = keys[i]!;
    const fn = mappers[i];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const val = (first.value as Record<keyof TRow, unknown>)[k];
    (columns[k] as unknown[]).push(fn === undefined ? val : fn(val));
  }
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
    for (let i = 0; i < numKeys; i++) {
      const k = keys[i]!;
      const fn = mappers[i];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const val = (row as Record<keyof TRow, unknown>)[k];
      (columns[k] as unknown[]).push(fn === undefined ? val : fn(val));
    }
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

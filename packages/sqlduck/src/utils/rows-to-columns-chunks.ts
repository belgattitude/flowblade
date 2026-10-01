import type { ValueMapperFn } from "../converter/create-duck-column-converters.ts";

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
        `transformers parameter contains unknown row ids: ${unknownKeys.join(", ")}`
      );
    }
    for (let i = 0; i < numKeys; i++) {
      mappers[i] = transformers[keys[i]];
    }
  }

  // Columns are kept as an array of preallocated arrays indexed by key
  // position: assigning by index avoids both the per-row keyed lookup on the
  // output object and the repeated backing store growth of push().
  function createColumns(): unknown[][] {
    // eslint-disable-next-line unicorn/no-new-array
    const cols = new Array<unknown[]>(numKeys);
    for (let i = 0; i < numKeys; i++) {
      // eslint-disable-next-line unicorn/no-new-array
      cols[i] = new Array<unknown>(chunkSize);
    }
    return cols;
  }

  // Applies each column's mapper in-place, once per chunk, after all of the
  // chunk's raw values have been copied in. Isolating the mapper call in its
  // own per-column loop keeps each call site monomorphic — it only ever
  // invokes that column's own mapper — instead of a single shared call site
  // that cycles through every column's differently-typed mapper on every
  // row, which V8 can degrade to a slower polymorphic/megamorphic dispatch.
  function toChunk(cols: unknown[][], length: number): TReturn {
    const chunk = {} as Record<keyof TRow, unknown[]>;
    for (let i = 0; i < numKeys; i++) {
      const target = cols[i]!;
      if (length < chunkSize) {
        target.length = length;
      }
      const fn = mappers[i];
      if (fn !== undefined) {
        for (let r = 0; r < length; r++) {
          target[r] = fn(target[r]);
        }
      }
      chunk[keys[i]!] = target;
    }
    return chunk as TReturn;
  }

  let columns: unknown[][] | null = createColumns();
  let rowsInChunk = 0;

  function addRow(row: TRow) {
    columns ??= createColumns();
    for (let i = 0; i < numKeys; i++) {
      columns[i]![rowsInChunk] = row[keys[i]!];
    }
    rowsInChunk++;
  }

  addRow(first.value);
  // In case chunkSize === 1 (or generally if the threshold already reached),
  // flush immediately after the first row to avoid off-by-one errors.
  if (rowsInChunk >= chunkSize) {
    yield toChunk(columns, rowsInChunk);
    // Allocated lazily on the next row, so no empty chunk is created when
    // the input ends on a chunk boundary.
    columns = null;
    rowsInChunk = 0;
  }

  // consume the rest, sync iterators are drained without awaiting each row
  if (Symbol.asyncIterator in rows) {
    for await (const row of rows) {
      addRow(row);
      if (rowsInChunk >= chunkSize) {
        yield toChunk(columns!, rowsInChunk);
        columns = null;
        rowsInChunk = 0;
      }
    }
  } else {
    for (const row of rows) {
      addRow(row);
      if (rowsInChunk >= chunkSize) {
        yield toChunk(columns!, rowsInChunk);
        columns = null;
        rowsInChunk = 0;
      }
    }
  }

  if (columns !== null && rowsInChunk > 0) {
    yield toChunk(columns, rowsInChunk);
  }
}

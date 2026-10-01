import type { ValueMapperFn } from "../converter/create-duck-column-converters.ts";

type RowsToConvertedColumnsChunksParams<TRow extends Record<string, unknown>> =
  {
    rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
    chunkSize: number;
    /**
     * Columns to extract from each row, in the order they are yielded.
     */
    columns: readonly (keyof TRow)[];
    /**
     * Value converters by column, columns without a converter are copied as is.
     */
    converters: Partial<Record<keyof TRow, ValueMapperFn>>;
  };

/**
 * Specialized version of `rowsToColumnsChunks` for when the columns and their
 * converters are known upfront (ie: `SqlDuck.toTable`).
 *
 * Yields chunks as an array of column arrays, aligned with `columns`, ready to
 * be passed to `DuckDBDataChunk.setColumns()`.
 *
 * Compared to `rowsToColumnsChunks`:
 * - columns come from `columns`, not from the first row: missing keys yield
 *   `undefined`, extra keys are ignored.
 * - converters only run over the columns that have one.
 *
 * @example
 * ```typescript
 * const chunks = rowsToConvertedColumnsChunks({
 *   rows: generateRows(), // { id: 1, name: 'A' }, { id: 2, name: 'B' }, ...
 *   chunkSize: 2,
 *   columns: ['id', 'name'],
 *   converters: { id: (v: number) => BigInt(v) },
 * });
 * for await (const chunk of chunks) {
 *   console.log(chunk);
 * }
 * // [[1n, 2n], ['A', 'B']]
 * ```
 */
export async function* rowsToConvertedColumnsChunks<
  TRow extends Record<string, unknown>,
>(
  params: RowsToConvertedColumnsChunksParams<TRow>
): AsyncIterableIterator<unknown[][]> {
  const { rows, chunkSize, columns, converters } = params;
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
  }
  const unknownKeys = Object.keys(converters).filter(
    (k) => !columns.includes(k as keyof TRow)
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `converters parameter contains unknown columns: ${unknownKeys.join(", ")}`
    );
  }

  const numColumns = columns.length;

  // Only the converted columns are visited when applying converters
  const convertedIdx: number[] = [];
  const convertedFns: ValueMapperFn[] = [];
  for (let i = 0; i < numColumns; i++) {
    const fn = converters[columns[i]!];
    if (fn !== undefined) {
      convertedIdx.push(i);
      convertedFns.push(fn);
    }
  }
  const numConverted = convertedIdx.length;

  // Preallocated arrays filled by index, avoids growing them with push()
  function createColumns(): unknown[][] {
    // eslint-disable-next-line unicorn/no-new-array
    const cols = new Array<unknown[]>(numColumns);
    for (let i = 0; i < numColumns; i++) {
      // eslint-disable-next-line unicorn/no-new-array
      cols[i] = new Array<unknown>(chunkSize);
    }
    return cols;
  }

  // Converters are applied per column, once per chunk, so each call site
  // stays monomorphic (see rowsToColumnsChunks).
  function toChunk(cols: unknown[][], length: number): unknown[][] {
    if (length < chunkSize) {
      for (let i = 0; i < numColumns; i++) {
        cols[i]!.length = length;
      }
    }
    for (let j = 0; j < numConverted; j++) {
      const fn = convertedFns[j]!;
      const target = cols[convertedIdx[j]!]!;
      for (let r = 0; r < length; r++) {
        target[r] = fn(target[r]);
      }
    }
    return cols;
  }

  let cols = createColumns();
  let rowsInChunk = 0;

  for await (const row of rows) {
    for (let i = 0; i < numColumns; i++) {
      cols[i]![rowsInChunk] = row[columns[i]!];
    }
    rowsInChunk++;
    if (rowsInChunk >= chunkSize) {
      yield toChunk(cols, rowsInChunk);
      cols = createColumns();
      rowsInChunk = 0;
    }
  }

  if (rowsInChunk > 0) {
    yield toChunk(cols, rowsInChunk);
  }
}

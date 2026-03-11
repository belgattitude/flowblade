// type SupportedRowTypes = string | number | boolean | Date | bigint | null;
type SupportedRowTypes = unknown;

type RowsToColumnarChunksParams<
  TRow extends Record<string, SupportedRowTypes>,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
};

export type RecordToColumnar<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K][];
} & {};

/**
 * Transform a row stream into a columnar stream of chunks.
 *
 * @example
 * ```typescript
 * type Row = { id:string, name:string, email:string };
 *
 * async function* getStreamFromDb(): AsyncGenerator<Row> {
 *   yield { id:'1', name:'A','email': 'a@b.com' };
 *   yield { id:'2', name:'B','email': 'a@b.com' };
 *   yield { id:'3', name:'C','email': 'a@b.com' };
 * }
 *
 * const chunkedDataframes = rowsToColumnarChunks({
 *  rows: getStreamFromDb(),
 *  chunkSize: 2
 * });
 *
 * const firstChunk = await chunkedDataframes.next();
 * // firstChunk.value === { name: ['A','B'], id: ['1','2'] }
 * ```
 */
export async function* rowsToColumnarChunks<
  TRow extends Record<string, SupportedRowTypes>,
>(
  params: RowsToColumnarChunksParams<TRow>
): AsyncIterableIterator<RecordToColumnar<TRow>> {
  const { rows, chunkSize } = params;

  let buffer: TRow[] = [];
  let keys: (keyof TRow)[] | null = null;

  for await (const row of rows) {
    // Initialize keys from the first row
    keys ??= Object.keys(row) as (keyof TRow)[];

    buffer.push(row);

    // When buffer reaches chunk size, transpose and yield
    if (buffer.length === chunkSize) {
      const transposed = {} as RecordToColumnar<TRow>;
      for (const key of keys) {
        transposed[key] = buffer.map((row) => row[key]);
      }

      yield transposed;
      buffer = [];
    }
  }

  // Handle remaining rows in the buffer
  if (buffer.length > 0 && keys !== null) {
    const transposed = {} as RecordToColumnar<TRow>;
    for (const key of keys) {
      transposed[key] = buffer.map((row) => row[key]);
    }

    yield transposed;
  }
}

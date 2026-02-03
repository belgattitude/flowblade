// type SupportedRowTypes = string | number | boolean | Date | bigint | null;
type SupportedRowTypes = unknown;

type IsUnique<
  T extends readonly unknown[],
  Acc extends readonly unknown[] = [],
> = T extends readonly [infer First, ...infer Rest]
  ? First extends Acc[number]
    ? false
    : IsUnique<Rest, readonly [...Acc, First]>
  : true;

type EnsureUniqueArray<T extends readonly unknown[]> =
  IsUnique<T> extends true ? T : never;

type RowsToColumnarChunksParams<
  TRow extends Record<string, SupportedRowTypes>,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
  // pickKeys?: (keyof TRow)[];
  pickKeys?: EnsureUniqueArray<readonly (keyof TRow)[]>;
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
 * async function* streamFromDb(): AsyncGenerator<Row> {
 *   yield { id:'1', name:'A','email': 'a@b.com' };
 *   yield { id:'2', name:'B','email': 'a@b.com' };
 *   yield { id:'3', name:'C','email': 'a@b.com' };
 * }
 *
 * const chunkedDataframes = await rowsToColumnarChunks({
 *  rows: streamFromDb,
 *  chunkSize: 2,
 *  // Optional, will pick all keys if not specified
 *  // if specified will pick the keys and maintain order
 *  pickKeys: ['id','name'],
 * });
 *
 * const firstChunk = await chunkedDataframes.next();
 * // firstChunk.value === { id: ['1','2'], name: ['A','B'] }
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

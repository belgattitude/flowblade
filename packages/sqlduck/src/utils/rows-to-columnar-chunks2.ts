type SupportedRowTypes = unknown;

type RowsToColumnarChunksParams<
  TRow extends Record<string, SupportedRowTypes>,
  TKeys extends keyof TRow = keyof TRow,
> = {
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>;
  chunkSize: number;
  /** Optional list of columns to include. If omitted, all columns are included. */
  columns?: TKeys[];
};

export type RecordToColumnar<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K][];
} & {};

export async function* rowsToColumnarChunks2<
  TRow extends Record<string, SupportedRowTypes>,
  TKeys extends keyof TRow = keyof TRow,
>(
  params: RowsToColumnarChunksParams<TRow, TKeys>
): AsyncIterableIterator<RecordToColumnar<Pick<TRow, TKeys>>> {
  const { rows, chunkSize, columns } = params;

  let buffer: TRow[] = [];
  let keys: TKeys[] | null = null;

  for await (const row of rows) {
    // Initialize keys from columns param or from the first row
    keys ??= columns ?? (Object.keys(row) as TKeys[]);

    buffer.push(row);

    if (buffer.length === chunkSize) {
      const transposed = {} as RecordToColumnar<Pick<TRow, TKeys>>;
      for (const key of keys) {
        transposed[key] = buffer.map((r) => r[key]) as Pick<
          TRow,
          TKeys
        >[TKeys][];
      }

      yield transposed;
      buffer = [];
    }
  }

  if (buffer.length > 0 && keys !== null) {
    const transposed = {} as RecordToColumnar<Pick<TRow, TKeys>>;
    for (const key of keys) {
      transposed[key] = buffer.map((r) => r[key]) as Pick<TRow, TKeys>[TKeys][];
    }

    yield transposed;
  }
}

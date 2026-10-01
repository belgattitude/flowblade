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
    /**
     * Compile a specialized row filler with `new Function` (unrolled columns,
     * static property access). Falls back to the generic loops when
     * compilation fails (ie: CSP forbidding eval) or columns aren't strings.
     * @default true
     */
    compile?: boolean;
  };

/**
 * Fill row `r` of `cols` with the (converted) values of `row`.
 */
type FillRowFn = (cols: unknown[][], row: unknown, r: number) => void;

/**
 * Compile a FillRowFn unrolled over the columns, ie for columns ['id', 'name']
 * with a converter on 'id':
 *
 * ```js
 * cols[0][r] = f0(row["id"]);
 * cols[1][r] = row["name"];
 * ```
 *
 * Static property names keep the property loads monomorphic and each
 * converter gets its own call site. Returns null when compilation isn't
 * possible, the caller must then use the generic path.
 */
export const compileFillRow = (
  columns: readonly PropertyKey[],
  converters: readonly (ValueMapperFn | undefined)[]
): FillRowFn | null => {
  const fnNames: string[] = [];
  const fns: ValueMapperFn[] = [];
  const lines: string[] = [];
  for (const [i, key] of columns.entries()) {
    if (typeof key !== "string") {
      return null;
    }
    // JSON.stringify produces a valid and safe js string literal
    const access = `row[${JSON.stringify(key)}]`;
    const fn = converters[i];
    if (fn === undefined) {
      lines.push(`cols[${i}][r] = ${access};`);
    } else {
      const name = `f${fns.length}`;
      fnNames.push(name);
      fns.push(fn);
      lines.push(`cols[${i}][r] = ${name}(${access});`);
    }
  }
  const body = `"use strict";\nreturn function fillRow(cols, row, r) {\n${lines.join("\n")}\n};`;
  try {
    // oxlint-disable-next-line no-new-func, typescript/no-implied-eval
    const factory = new Function(...fnNames, body) as (
      ...fns: ValueMapperFn[]
    ) => FillRowFn;
    return factory(...fns);
  } catch {
    return null;
  }
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
  const { rows, chunkSize, columns, converters, compile = true } = params;
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

  const fillRow = compile
    ? compileFillRow(
        columns,
        columns.map((c) => converters[c])
      )
    : null;

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

  // Without compilation, converters are applied per column, once per chunk,
  // so each call site stays monomorphic (see rowsToColumnsChunks).
  function toChunk(cols: unknown[][], length: number): unknown[][] {
    if (length < chunkSize) {
      for (let i = 0; i < numColumns; i++) {
        cols[i]!.length = length;
      }
    }
    if (fillRow !== null) {
      // Already converted by fillRow
      return cols;
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
    if (fillRow === null) {
      for (let i = 0; i < numColumns; i++) {
        cols[i]![rowsInChunk] = row[columns[i]!];
      }
    } else {
      fillRow(cols, row, rowsInChunk);
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

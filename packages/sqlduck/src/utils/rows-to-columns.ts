/**
 * Consumes an async stream of rows and yields exactly one item: the columns array.
 * Example:
 *   input:  [{ id: '1', name: 'Seb' }, { id: '2', name: 'Ada' }]
 *   output: [["1", "2"], ["Seb", "Ada"]]
 */
export async function* rowsToColumns<TRow extends Record<string, unknown>>(
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>
): AsyncIterableIterator<TRow[keyof TRow][][]> {
  // Pull the first row to determine column order
  const first = await rows.next();
  if (first.done) return; // empty input → yield nothing

  const keys = Object.keys(first.value) as (keyof TRow)[]; // column order comes from the first row
  const columns: TRow[keyof TRow][][] = keys.map(() => []);

  // push first row values
  keys.forEach((k, i) => columns[i]!.push(first.value[k]));

  // consume the rest
  for await (const row of rows) {
    keys.forEach((k, i) => columns[i]!.push(row[k]));
  }

  // Yield one columns block: [[ids...], [names...], ...]
  yield columns;
}

/**
 * Consumes an async stream of rows and yields exactly one item: the columns array.
 * Example:
 *   input:  [{ id: '1', name: 'Seb' }, { id: '2', name: 'Ada' }]
 *   output: [["1", "2"], ["Seb", "Ada"]]
 *
 * @yields {TRow[keyof TRow][][]} The columns array, once all the rows have been consumed.
 */
export async function* rowsToColumns<TRow extends Record<string, unknown>>(
  rows: AsyncGenerator<TRow> | Generator<TRow> | AsyncIterableIterator<TRow>
): AsyncIterableIterator<TRow[keyof TRow][][]> {
  // Pull the first row to determine column order
  const first = await rows.next();
  if (first.done === true) {
    return;
  } // empty input → yield nothing

  const keys = Object.keys(first.value) as (keyof TRow)[]; // column order comes from the first row
  const entries = keys.map((key) => {
    return { key, values: [] as TRow[keyof TRow][] };
  });
  const columns = entries.map((entry) => entry.values);

  // push first row values
  for (const { key, values } of entries) {
    values.push(first.value[key]);
  }

  // consume the rest
  for await (const row of rows) {
    for (const { key, values } of entries) {
      values.push(row[key]);
    }
  }

  // Yield one columns block: [[ids...], [names...], ...]
  yield columns;
}

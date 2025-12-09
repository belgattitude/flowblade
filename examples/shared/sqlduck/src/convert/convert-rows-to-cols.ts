import { DuckDBTimestampValue, type DuckDBValue } from '@duckdb/node-api';

/**
 * @example
 * ```typescript
 * const columns = convertRowsToCols([
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 * ]);
 * expect(columns).toStrictEqual([
 *   [1, 2],          // Column for 'id'
 *   ['Alice', 'Bob'] // Column for 'name'
 * ]);
 * ```
 */
export const convertRowsToCols = <TRow extends Record<string, unknown>>(
  rows: Iterable<TRow>
): DuckDBValue[][] => {
  const it = rows[Symbol.iterator]();
  const firstResult = it.next();
  if (firstResult.done) return [];

  const first = firstResult.value;
  const keys = Object.keys(first);

  const columns: DuckDBValue[][] = keys.map(() => []);

  const toDuckValue = (value: unknown): DuckDBValue => {
    if (value instanceof Date) {
      return new DuckDBTimestampValue(BigInt(value.getTime() * 1000));
    }
    return value === undefined ? null : (value as DuckDBValue);
  };

  const pushRow = (row: TRow) => {
    for (const [i, key_] of keys.entries()) {
      const key = key_;
      const hasKey = key in row;
      const value = hasKey ? (row as Record<string, unknown>)[key] : null;
      columns[i]!.push(toDuckValue(value));
    }
  };

  // push first row
  pushRow(first);

  // continue streaming consumption using the same iterator
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = it.next();
    if (n.done) break;
    pushRow(n.value);
  }

  return columns;
};

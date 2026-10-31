import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Set the session `preserve_insertion_order` setting.
 *
 * @returns the value before the change, `undefined` if it can't be read
 * (nothing to restore then).
 */
export const setPreserveInsertionOrder = async (
  conn: DuckDBConnection,
  value: boolean
): Promise<boolean | undefined> => {
  const reader = await conn.runAndReadAll(
    "SELECT current_setting('preserve_insertion_order') as value"
  );
  const original = reader.getRowObjects()[0]?.value as boolean | undefined;
  await conn.run(`SET preserve_insertion_order = ${value};`);
  return original;
};

export const restorePreserveInsertionOrder = async (
  conn: DuckDBConnection,
  value: boolean
): Promise<void> => {
  await conn.run(`SET preserve_insertion_order = ${value};`);
};

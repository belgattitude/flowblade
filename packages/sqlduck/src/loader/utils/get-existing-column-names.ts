import type { DuckDBConnection } from "@duckdb/node-api";

import type { Table } from "../../objects/table.ts";

/**
 * Return the column names of an existing table in column order, or
 * `undefined` when the table doesn't exist.
 *
 * The database and schema default to the current ones, names are compared
 * case-insensitively (as DuckDB identifiers).
 */
export const getExistingColumnNames = async (
  conn: DuckDBConnection,
  table: Table
): Promise<string[] | undefined> => {
  const reader = await conn.runAndReadAll(
    `SELECT column_name
     FROM duckdb_columns()
     WHERE lower(database_name) = lower(coalesce($database::VARCHAR, current_database()))
       AND lower(schema_name) = lower(coalesce($schema::VARCHAR, current_schema()))
       AND lower(table_name) = lower($table::VARCHAR)
     ORDER BY column_index`,
    {
      database: table.databaseName ?? null,
      schema: table.schemaName ?? null,
      table: table.tableName,
    }
  );
  const names = reader.getRowObjects().map((row) => String(row.column_name));
  return names.length === 0 ? undefined : names;
};

/**
 * Throw when the existing table columns don't match the schema columns,
 * the appender strategies write values by position.
 */
export const assertSameColumns = (
  table: Table,
  existing: readonly string[],
  expected: readonly string[]
): void => {
  const same =
    existing.length === expected.length &&
    existing.every(
      (name, i) => name.toLowerCase() === expected[i]?.toLowerCase()
    );
  if (!same) {
    throw new Error(
      `Columns of the existing table '${table.getFullName()}' (${existing.join(", ")}) don't match the schema columns (${expected.join(", ")}), names and order must be identical.`
    );
  }
};

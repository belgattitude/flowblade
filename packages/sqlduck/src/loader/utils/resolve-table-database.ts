import type { DuckDBConnection } from "@duckdb/node-api";

import type { Table } from "../../objects/table.ts";

export type TableDatabase = {
  /**
   * Name of the database, `table.databaseName` or the current database.
   */
  name: string;
  /**
   * Whether the database is stored in a file (`false` for in-memory ones).
   */
  isFile: boolean;
};

/**
 * Find the database holding `table`: `table.databaseName`, or the current
 * database when not set, compared case-insensitively like DuckDB does.
 * In-memory databases have no path in `duckdb_databases()`, whatever their
 * name.
 */
export const resolveTableDatabase = async (
  conn: DuckDBConnection,
  table: Table
): Promise<TableDatabase> => {
  const reader = await conn.runAndReadAll(
    `SELECT database_name, path
     FROM duckdb_databases()
     WHERE lower(database_name) = lower(coalesce($database::VARCHAR, current_database()))`,
    { database: table.databaseName ?? null }
  );
  const [row] = reader.getRowObjects();
  if (row === undefined) {
    throw new Error(
      `Database '${table.databaseName ?? "current"}' of table '${table.getFullName()}' is not attached.`
    );
  }
  return {
    name: String(row.database_name),
    isFile: row.path !== null,
  };
};

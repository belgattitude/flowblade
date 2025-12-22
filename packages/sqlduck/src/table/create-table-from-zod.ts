import type { DuckDBConnection, DuckDBType } from '@duckdb/node-api';

import { getTableCreateFromZod } from './get-table-create-from-zod';
import type { Table } from './table';
import type { TableSchemaZod } from './table-schema-zod.type';

export const createTableFromZod = async (params: {
  conn: DuckDBConnection;
  table: Table;
  schema: TableSchemaZod;
}): Promise<{
  ddl: string;
  columnTypes: [name: string, type: DuckDBType][];
}> => {
  const { conn, table, schema } = params;
  const { ddl, columnTypes } = getTableCreateFromZod(table, schema);
  try {
    await conn.run(ddl);
  } catch (e) {
    throw new Error(
      `Failed to create table '${table.getFullyQualifiedTableName()}': ${(e as Error).message}`,
      {
        cause: e as Error,
      }
    );
  }
  return { ddl, columnTypes };
};

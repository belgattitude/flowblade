import type { DuckDBConnection, DuckDBType } from '@duckdb/node-api';

import {
  getTableCreateFromZod,
  type TableCreateOptions,
} from './get-table-create-from-zod.ts';
import type { Table } from './table.ts';
import type { TableSchemaZod } from './table-schema-zod.type.ts';

export const createTableFromZod = async (params: {
  conn: DuckDBConnection;
  table: Table;
  schema: TableSchemaZod;
  options?: TableCreateOptions;
}): Promise<{
  ddl: string;
  columnTypes: [name: string, type: DuckDBType][];
}> => {
  const { conn, table, schema, options } = params;
  const { ddl, columnTypes } = getTableCreateFromZod(table, schema, options);
  try {
    await conn.run(ddl);
  } catch (e) {
    throw new Error(
      `Failed to create table '${table.getFullName()}': ${(e as Error).message}`,
      {
        cause: e as Error,
      }
    );
  }
  return { ddl, columnTypes };
};

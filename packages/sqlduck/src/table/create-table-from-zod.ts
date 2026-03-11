import type { DuckDBConnection } from '@duckdb/node-api';

import {
  getTableCreateFromZod,
  type GetTableCreateFromZodParams,
  type TableCreateFromZodResult,
} from './get-table-create-from-zod.ts';
import type { TableSchemaZod } from './table-schema-zod.type.ts';

export const createTableFromZod = async <TSchema extends TableSchemaZod>(
  params: {
    conn: DuckDBConnection;
  } & GetTableCreateFromZodParams<TSchema>
): Promise<TableCreateFromZodResult<TSchema>> => {
  const { conn, table, schema, options } = params;
  const { ddl, columnTypes } = getTableCreateFromZod({
    table,
    schema,
    options,
  });
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

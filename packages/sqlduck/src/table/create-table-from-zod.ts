import type { DuckDBConnection } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';

import { sqlduckDefaultLogtapeLogger } from '../logger/sqlduck-default-logtape-logger.ts';
import {
  getTableCreateFromZod,
  type GetTableCreateFromZodParams,
  type TableCreateFromZodResult,
} from './get-table-create-from-zod.ts';
import type { TableSchemaZod } from './table-schema-zod.type.ts';

export const createTableFromZod = async <TSchema extends TableSchemaZod>(
  params: {
    conn: DuckDBConnection;
    logger?: Logger;
  } & GetTableCreateFromZodParams<TSchema>
): Promise<TableCreateFromZodResult<TSchema>> => {
  const {
    conn,
    table,
    schema,
    options,
    logger = sqlduckDefaultLogtapeLogger,
  } = params;
  const { ddl, columnTypes } = getTableCreateFromZod({
    table,
    schema,
    options,
  });

  logger.debug(`Generate DDL for table '${table.getFullName()}'`, {
    ddl,
  });

  try {
    await conn.run(ddl);
    logger.info(`Table '${table.getFullName()}' successfully created`, {
      ddl,
    });
  } catch (e) {
    logger.error(
      `Failed to create table '${table.getFullName()}': ${(e as Error).message}`,
      {
        ddl,
      }
    );

    throw new Error(
      `Failed to create table '${table.getFullName()}': ${(e as Error).message}`,
      {
        cause: e as Error,
      }
    );
  }
  return { ddl, columnTypes };
};

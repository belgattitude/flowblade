import type { DuckDBConnection } from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";

import { sqlduckDefaultLogtapeLogger } from "../logger/sqlduck-default-logtape-logger.ts";
import { getErrorMessage } from "../utils/get-error-message.ts";
import type { TableSchemaZod } from "../validation/zod/index.ts";
import { getTableCreateFromZod } from "./get-table-create-from-zod.ts";
import type {
  GetTableCreateFromZodParams,
  TableCreateFromZodResult,
} from "./get-table-create-from-zod.ts";

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

  const tableFullName = table.getFullName();
  logger.debug("Generate DDL for table '{table}'", {
    table: tableFullName,
    ddl,
  });

  try {
    await conn.run(ddl);
    logger.info("Table '{table}' successfully created", {
      table: tableFullName,
      ddl,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Failed to create table '{table}': {errorMessage}", {
      table: tableFullName,
      ddl,
      errorMessage,
    });

    throw new Error(
      `Failed to create table '${tableFullName}': ${errorMessage}`,
      {
        cause: error,
      }
    );
  }
  return { ddl, columnTypes };
};

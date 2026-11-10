import { DuckDBConnection } from "@duckdb/node-api";
import type { AsyncQResult, QMetaMaterializationSpan } from "@flowblade/core";
import { QMeta } from "@flowblade/core";
import { createQResultError } from "@flowblade/core/datasource";
import { DuckdbDatasource } from "@flowblade/source-duckdb";

import type { LoadResult } from "../../loader/types.ts";
import type { Table } from "../../objects/table.ts";
import { getErrorMessage } from "../../utils/get-error-message.ts";
import type { KyselyQueryWithZodSchema } from "./kysely-query-with-zod-schema.ts";
import {
  createMaterializedTable,
  dropTableQuietly,
  getInvalidMaterializationTarget,
  loadKyselyQueryIntoTable,
} from "./materialize-kysely-query.ts";

type Params<TData extends unknown[]> = {
  duckConn: DuckdbDatasource | DuckDBConnection;
  table: KyselyQueryWithZodSchema;
  /**
   * Database where the temporary table is created (e.g. an attached file database).
   * Defaults to the connection's current database.
   */
  database?: string;
  /**
   * Schema where the temporary table is created (must already exist).
   * Defaults to the connection's current schema.
   */
  schema?: string;
  /**
   * Abort the materialization: stops the Kysely query stream and the load.
   * Also provided to `query`; pass it to `dsDuck.query` to abort the DuckDB query.
   */
  signal?: AbortSignal;
  /**
   * Query to run in duckdb on the materialized table.
   * Its rows type is the one returned by `withMaterializedKyselyQuery`.
   */
  query: (options: {
    dsDuck: DuckdbDatasource;
    table: Table;
    signal?: AbortSignal;
  }) => AsyncQResult<TData>;
};

export const createMaterializationSpan = (
  params: Omit<QMetaMaterializationSpan, "type">
): QMetaMaterializationSpan => {
  return {
    type: "materialization",
    ...params,
  };
};

const toDuckdbDatasource = (
  duckConn: DuckdbDatasource | DuckDBConnection
): DuckdbDatasource =>
  duckConn instanceof DuckDBConnection
    ? new DuckdbDatasource({ connection: duckConn })
    : duckConn;

/**
 * Materialize a kysely query into a temporary duckdb table, run `query` on it,
 * then attempt to drop the table (whatever the outcome). Cleanup is best effort;
 * a failed drop does not replace the query result or error and may leave the
 * table behind.
 */
export const withMaterializedKyselyQuery = async <
  TData extends unknown[] = unknown[],
>(
  params: Params<TData>
): AsyncQResult<TData> => {
  const { duckConn, table, query, database, schema, signal } = params;
  const invalidTarget = getInvalidMaterializationTarget({ database, schema });
  if (invalidTarget !== null) {
    return createQResultError(
      { message: invalidTarget, code: "QUERY_FAILED" },
      new QMeta({})
    );
  }
  const dsDuck = toDuckdbDatasource(duckConn);
  const materializedTable = createMaterializedTable({ database, schema });

  try {
    let materialized: LoadResult;
    try {
      materialized = await loadKyselyQueryIntoTable({
        dsDuck,
        table,
        materializedTable,
        signal,
      });
    } catch (error) {
      return createQResultError(
        {
          message: `Can't materialize table ${materializedTable.getFullName()} - ${getErrorMessage(error)}`,
          code: "QUERY_FAILED",
          cause: error,
        },
        new QMeta({})
      );
    }

    const queryResult = await query({
      dsDuck,
      table: materializedTable,
      signal,
    });
    if (!queryResult.error) {
      queryResult.meta.prependSpan(
        createMaterializationSpan({
          // Never undefined, the 'create' mode always runs a DDL
          ddl: materialized.createTableDDL ?? "",
          timeMs: materialized.timeMs,
          affectedRows: materialized.totalRows,
          tableName: materializedTable.getFullName(),
        })
      );
    }
    return queryResult;
  } finally {
    // the table may also have been partially created when materialization failed
    await dropTableQuietly(dsDuck, materializedTable);
  }
};

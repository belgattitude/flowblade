import { DuckDBConnection } from "@duckdb/node-api";
import type {
  QResult,
  QError,
  AsyncQResult,
  QMetaSqlSpan,
} from "@flowblade/core";
import {
  createQResultError,
  createQResultSuccess,
  QMeta,
} from "@flowblade/core";
import { DuckdbDatasource } from "@flowblade/source-duckdb";

import type { Table } from "../../objects/table.ts";
import {
  SqlDuck,
  type ToTableParams,
  type ToTableResult,
} from "../../sql-duck.ts";
import { createRandomTable } from "../../table/create-random-table.ts";
import type { KyselyMaterializableTable } from "./kysely-materializable-table.ts";

type WithMaterializedQueryResult = QResult<Record<string, unknown>[], QError>;

type Params = {
  duckConn: DuckdbDatasource | DuckDBConnection;
  table: KyselyMaterializableTable;
  query: (options: {
    dsDuck: DuckdbDatasource;
    table: Table;
  }) => Promise<QResult<Record<string, unknown>[], QError>>;
};

export interface QMetaMaterializationSpan {
  type: "materialization";
  ddl: string;
  timeMs: number;
  affectedRows: number;
  table: Table;
}

export const createMaterializationSpan = (
  params: Omit<QMetaMaterializationSpan, "type">
): QMetaMaterializationSpan => {
  return {
    type: "materialization",
    ...params,
  };
};

export const withMaterializedKyselyQuery = async (
  params: Params
): Promise<WithMaterializedQueryResult> => {
  const chunkSize = 1024;
  const { duckConn, table, query } = params;
  const dsDuck =
    duckConn instanceof DuckDBConnection
      ? new DuckdbDatasource({
          connection: duckConn,
        })
      : duckConn;
  const sqlDuck = new SqlDuck({ conn: dsDuck.getConnection() });
  const rowStream = table.getSourceQuery().stream({
    chunkSize,
  });

  const materializedTable = createRandomTable({
    prefix: "_materialized",
  });

  let result: ToTableResult;

  try {
    result = await sqlDuck.toTable({
      chunkSize,
      rowStream,
      schema: table.getSchema(),
      table: materializedTable,
      autoCheckpoint: materializedTable.databaseName !== undefined,
    });
  } catch (error) {
    const message = `Can't materialize table ${materializedTable.getFullName()} - ${(error as Error).message}`;
    return createQResultError({ message }, new QMeta({}));
  }

  const materializedSpan = createMaterializationSpan({
    ddl: result.createTableDDL,
    timeMs: result.timeMs,
    affectedRows: result.totalRows,
    table: materializedTable,
  });

  const queryResult = await query({ dsDuck, table: materializedTable });
  if (queryResult.error) {
    return queryResult;
  }

  const previousState = queryResult.meta.getSpans();

  console.log("queryResult", queryResult);
  console.log("queryResult", queryResult.toJsonifiable());

  queryResult.meta.addSpan(materializedSpan);

  return queryResult;
};

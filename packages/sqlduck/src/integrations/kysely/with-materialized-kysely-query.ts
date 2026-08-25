import type { DuckDBConnection } from "@duckdb/node-api";

import { Table } from "../../objects/table.ts";
import { SqlDuck } from "../../sql-duck.ts";
import type { KyselyMaterializableTable } from "./kysely-materializable-table.ts";

type Return = {
  data: Record<string, unknown>[];
  meta: {
    create: {
      ddl: string;
      timeMs: number;
      rows: number;
    };
  };
};

type Params = {
  duckConn: DuckDBConnection;
  table: KyselyMaterializableTable;
  query: (options: {
    duckConn: DuckDBConnection;
  }) => Promise<Record<string, unknown>[]>;
};

export const withMaterializedKyselyQuery = async (
  params: Params
): Promise<Return> => {
  const chunkSize = 1024;
  const { duckConn, table, query } = params;
  const sqlDuck = new SqlDuck({ conn: duckConn });
  const rowStream = table.getSourceQuery().stream({
    chunkSize,
  });
  const result = await sqlDuck.toTable({
    chunkSize,
    rowStream,
    schema: table.getSchema(),
    table: new Table({
      name: "cool",
      database: "memory",
    }),
  });

  const data = await query({ duckConn });

  return {
    data,
    meta: {
      create: {
        ddl: result.createTableDDL,
        timeMs: result.timeMs,
        rows: result.totalRows,
      },
    },
  };
};

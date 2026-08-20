import type { SelectQueryBuilder } from "kysely";
import type {DuckDBConnection} from "@duckdb/node-api";
import {SqlDuck} from "../../sql-duck.ts";

export const withMaterializedKyselyQuery = async <
  T extends SelectQueryBuilder<any, any, any>,
>(
  kyselyQuery: T,
  duckConn: DuckDBConnection,
  schema: unknown
) => {
    const chunkSize = 1024;
    const sqlDuck = new SqlDuck({conn: duckConn});
    const rowStream =  kyselyQuery.stream({
        chunkSize
    });
    const result = await sqlDuck.toTable({
        chunkSize,
        rowStream,
        schema,

    })

};

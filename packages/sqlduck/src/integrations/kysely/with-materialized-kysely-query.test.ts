import {createDummyKyselyDb} from "#/tests/utils/create-dummy-kysely-db.ts";
import * as z from "zod";
import {SqlDuck} from "../../sql-duck.ts";
import type {DuckDBConnection} from "@duckdb/node-api";
import {createDuckdbTestMemoryDb} from "#/tests/utils/create-duckdb-test-memory-db.ts";
import {withMaterializedKyselyQuery} from "./with-materialized-kysely-query.ts";

describe('withMaterializedKyselyQuery', () => {

    let duckConn: DuckDBConnection;

    beforeAll(async () => {
        duckConn = await createDuckdbTestMemoryDb();
    });
    afterAll(async () => {
        duckConn.closeSync();
    });

    type DB = {
        user: {
            id: number;
            name: string;
        }
    }
    const db = createDummyKyselyDb<DB>('postgresql')

    it('should materialize the query as table', async () => {
        const query = db.selectFrom('user').select(['id', 'name']);
        const querySchema = z.strictObject({
            id: z.number(),
            name: z.string(),
        })
        const sqlDuck = new SqlDuck({conn: duckConn});

        const data = await withMaterializedKyselyQuery(query, duckConn, querySchema);


    });
});
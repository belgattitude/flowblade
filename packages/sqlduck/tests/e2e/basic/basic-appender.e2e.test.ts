import type { DuckDBConnection } from "@duckdb/node-api";
import { expect, afterAll, describe, beforeAll, it } from "vitest";
import * as z from "zod";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import type { DuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";

import { DuckDatabaseManager, Table } from "../../../src/index.ts";
import { DuckTableLoader } from "../../../src/loader/index.ts";

describe("basic appender", () => {
  let conn: DuckDBConnection;
  let duckDb: DuckdbTestMemoryDb | undefined;

  beforeAll(async () => {
    duckDb = await openDuckdbTestMemoryDb();
    ({ conn } = duckDb);
  });

  afterAll(async () => {
    duckDb?.close();
  });

  describe("DuckTableLoader", () => {
    it("should correclty append data", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attach({
        type: "memory", // can be 'filesystem', ...
        alias: "mydb",
        options: { compress: false },
      });

      const loader = new DuckTableLoader({ conn });

      // Define a zod schema, it will be used to create the table
      const userSchema = z.object({
        id: z.int32().min(1).meta({ primaryKey: true }),
        name: z.string(),
        decimal_18_3: z.float32().meta({
          multipleOf: 0.001,
        }),
      });

      // Example of a datasource (can be an array, generator, async iterable...)
      async function* getUsers(): AsyncIterableIterator<
        z.input<typeof userSchema>
      > {
        // database or api call
        yield { id: 1, name: "John", decimal_18_3: 1.001 };
        yield { id: 2, name: "Jane", decimal_18_3: 2 };
      }

      // Create a table from the schema and load the rows
      const result = await loader.load({
        table: new Table({ name: "user", database: database.alias }),
        schema: userSchema, // The schema to use to create the table
        rows: getUsers(), // The rows to load
        // 👇Optional:
        mode: "createOrReplace",
        checkpoint: { everyRows: 2048, onComplete: true },
        progress: {
          everyRows: 2048,
          onProgress: ({ intervalMs, totalRows, rowsPerSecond }) => {
            console.log(
              `Loaded ${totalRows} rows, est: ${rowsPerSecond} rows/s over ${intervalMs}ms`
            );
          },
        },
      });
      expect(result).toStrictEqual({
        timeMs: expect.any(Number),
        totalRows: 2,
        createTableDDL: expect.stringMatching(/^CREATE OR REPLACE TABLE(.*)/),
        strategy: "chunkAppender",
        mode: "createOrReplace",
      });

      const reader = await conn.runAndReadAll("select * from mydb.user");
      expect(reader.getRowObjectsJS()).toStrictEqual([
        {
          decimal_18_3: 1.001,
          id: 1,
          name: "John",
        },
        {
          decimal_18_3: 2,
          id: 2,
          name: "Jane",
        },
      ]);
    });
  });
});

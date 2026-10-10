import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckdbDatasource, sql } from "@flowblade/source-duckdb";
import { isParsableStrictIsoDateZ } from "@httpx/assert";
import { reset } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";
import isInCi from "is-in-ci";
import {
  beforeAll,
  describe,
  it,
  vi,
  afterEach,
  expect,
  afterAll,
  beforeEach,
} from "vitest";
import * as z from "zod";

import { configureTestLogger } from "#tests/utils/configure-test-logger.ts";
import { createDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { createFakeRowsAsyncIterator } from "#tests/utils/create-fake-rows-iterator.ts";

import type { OnChunkAppendedCb } from "./appender/data-appender-callback.ts";
import { flowbladeLogtapeSqlduckConfig } from "./config/flowblade-logtape-sqlduck.config";
import { DuckDatabaseManager } from "./manager/database/duck-database-manager.ts";
import { Table } from "./objects/table";
import { SqlDuck } from "./sql-duck";
import { getTableCreateFromZod } from "./table/get-table-create-from-zod";
import { zodCodecs } from "./utils/zod-codecs.ts";

const testTimeout = 15_000;

describe("Duckdb tests", async () => {
  let conn: DuckDBConnection;
  beforeAll(async () => {
    conn = await createDuckdbTestMemoryDb({
      // Keep it high to prevent going to .tmp directory
      max_memory: isInCi ? "128M" : "256M",
      threads: 1,
    });
  });

  afterAll(() => {
    conn.closeSync();
  });

  describe(
    "toTable",
    () => {
      it("Should append data into duckdb memory table", async () => {
        const bignumberExample = 9_223_372_036_854_775_807n;

        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: "memory",
          alias: "sql_duck_test",
        });

        const ds = new DuckdbDatasource({
          connection: conn,
        });

        const sqlDuck = new SqlDuck({ conn });

        const userSchema = z.strictObject({
          id: z.int32().meta({ description: "cool" }),
          name: z.string(),
          email: z.email().nullable(),
          bignumber: z.nullable(zodCodecs.bigintToString),
          created_at: zodCodecs.dateToString,
          gender: z.nullable(z.enum(["M", "F"])),
          list_of_strings: z.nullable(z.array(z.string())),
          list_of_int32s: z.nullable(z.array(z.int32())),
          list_of_float32s: z.nullable(z.array(z.float32())),
          list_of_booleans: z.nullable(z.array(z.boolean())),
          // uuid_v7: z.nullable(z.uuidv7()),
        });

        const limit = isInCi ? 10_000 : 100_000;

        const testTable = new Table({
          name: "test",
          database: database.alias,
        });

        const now = new Date("2025-12-16 00:00:00");
        const listColumns = {
          list_of_float32s: [1.1, 2.2, 3.3],
          list_of_int32s: [5, 6],
          list_of_booleans: [true, false],
          list_of_strings: ["Hello", "World"],
        };
        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema: userSchema,
          factory: ({ faker, rowIdx }) => {
            if (rowIdx === 0) {
              return {
                id: z.int32().parse(rowIdx),
                name: `unique-record-for-tests`,
                email: `unique-record-for-tests@example.com`,
                bignumber: bignumberExample,
                created_at: now,
                gender: "F",
                // uuid_v7: '019d2155-d292-71fa-87d7-9d1f1ed83569',
                ...listColumns,
              } as const;
            }
            return {
              id:
                faker.number.int({
                  min: 10,
                  max: 1_000_000,
                }) + rowIdx,
              name: faker.person.fullName(),
              email: faker.internet.email(),
              bignumber: faker.number.bigInt(),
              created_at: faker.date.recent(),
              gender: "M",
              // uuid_v7: faker.string.uuid({ version: 7 }),
              ...listColumns,
            } as const;
          },
        });

        const cb = vi.fn<OnChunkAppendedCb>();

        const { timeMs, totalRows, createTableDDL } = await sqlDuck.toTable({
          table: testTable,
          schema: userSchema,
          rowStream: getFakeRowStream(),
          chunkSize: 2048,
          onChunkAppended: cb,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
          checkpointChunksFrequency: 4,
          autoCheckpoint: true,
        });

        expect(cb).toHaveBeenCalledTimes(Math.ceil(limit / 2048));

        expect(cb).toHaveBeenNthCalledWith(1, {
          totalRows: 2048,
          timeMs: expect.any(Number),
          rowsPerSecond: expect.any(Number),
        });

        expect(cb).toHaveBeenLastCalledWith({
          totalRows,
          timeMs: expect.any(Number),
          rowsPerSecond: expect.any(Number),
        });

        expect(totalRows).toBe(limit);
        expect(timeMs).toBeGreaterThan(100);
        expect(createTableDDL).toStrictEqual(
          getTableCreateFromZod({
            table: testTable,
            schema: userSchema,
            options: {
              create: "CREATE_OR_REPLACE",
            },
          }).ddl
        );

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${testTable.getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            count_star: BigInt(limit),
          },
        ]);

        const params = {
          name: "unique-record-for-tests",
        } as const;

        const { data } = await ds.query(
          sql<{
            name: string;
            bignumber: string;
            email: string;
            created_at: string;
            gender: string;
            list_of_strings: string[];
            list_of_booleans: boolean[];
            list_of_float32s: number[];
            list_of_int32s: number[];
            // uuid_v7: string;
          }>`SELECT 
              name,
              bignumber, 
              email, 
              strftime(created_at::TIMESTAMPTZ, '%Y-%m-%dT%H:%M:%S.%gZ') as created_at,
              gender,
              list_of_strings,
              list_of_booleans,
              list_of_float32s,
              list_of_int32s
             FROM ${sql.raw(testTable.getFullName())} 
             WHERE name = ${params.name} 
             LIMIT 1`
        );
        const {
          name,
          bignumber,
          email,
          created_at,
          gender,
          list_of_booleans,
          list_of_strings,
          list_of_float32s,
          list_of_int32s,
        } = data?.[0] ?? {};
        expect(name).toBe("unique-record-for-tests");
        expect(email).toBe("unique-record-for-tests@example.com");
        expect(bignumber).toStrictEqual(bignumberExample.toString(10));
        expect(isParsableStrictIsoDateZ(created_at)).toBe(true);

        expect(created_at).toBe(now.toISOString());
        expect(gender).toBe("F");
        expect(list_of_booleans).toStrictEqual(listColumns.list_of_booleans);
        expect(
          list_of_float32s!.map((val) => Math.round(val * 100) / 100)
        ).toStrictEqual(listColumns.list_of_float32s);
        expect(list_of_int32s).toStrictEqual(listColumns.list_of_int32s);
        expect(list_of_strings).toStrictEqual(listColumns.list_of_strings);
      });

      it("Should respect onChunkAppendedFrequency", async () => {
        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: "memory",
          alias: "sql_duck_test_frequency",
        });

        const sqlDuck = new SqlDuck({ conn });

        const schema = z.object({
          id: z.number(),
        });

        // 10 chunks of 10 rows = 100 rows
        const limit = 100;
        const chunkSize = 10;
        const frequency = 3;

        const testTable = new Table({
          name: "test_frequency",
          database: database.alias,
        });

        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema,
          factory: ({ rowIdx }) => {
            return { id: rowIdx };
          },
        });

        const cb = vi.fn<OnChunkAppendedCb>();

        // Act
        await sqlDuck.toTable({
          table: testTable,
          schema,
          rowStream: getFakeRowStream(),
          chunkSize,
          onChunkAppended: cb,
          onChunkAppendedFrequency: frequency,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        // Assert
        // Total chunks = 10
        // Frequency = 3
        // Callback should be called at chunks: 3, 6, 9
        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ totalRows: 30 })
        );
        expect(cb).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ totalRows: 60 })
        );
        expect(cb).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ totalRows: 90 })
        );
      });

      it("Should respect flushSyncFrequency", async () => {
        // Arrange
        const dbManager = new DuckDatabaseManager(conn);
        const database = await dbManager.attachIfNotExists({
          type: "memory",
          alias: "sql_duck_test_flush",
        });

        const sqlDuck = new SqlDuck({ conn });

        const schema = z.object({
          id: z.number(),
        });

        // 10 chunks of 10 rows = 100 rows
        const limit = 100;
        const chunkSize = 10;
        const flushFrequency = 4;

        const testTable = new Table({
          name: "test_flush",
          database: database.alias,
        });

        const getFakeRowStream = createFakeRowsAsyncIterator({
          count: limit,
          schema,
          factory: ({ rowIdx }) => {
            return { id: rowIdx };
          },
        });

        // Since we can't easily spy on the appender created internally,
        // we'll at least verify it doesn't crash and the data is inserted.
        // If there were a way to provide a custom appender or spy on createAppender, we would.

        // Act
        const result = await sqlDuck.toTable({
          table: testTable,
          schema,
          rowStream: getFakeRowStream(),
          chunkSize,
          flushSyncFrequency: flushFrequency,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        // Assert
        expect(result.totalRows).toBe(limit);

        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star from ${testTable.getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            count_star: BigInt(limit),
          },
        ]);
      });

      describe("signal", () => {
        const schema = z.object({ id: z.number() });

        it("Should reject with the abort reason and keep appended chunks", async () => {
          const sqlDuck = new SqlDuck({ conn });
          const testTable = new Table({ name: "test_abort" });
          const controller = new AbortController();
          let closed = false;
          async function* rows() {
            try {
              for (let id = 0; id < 100; id++) {
                if (id === 25) {
                  controller.abort();
                }
                yield { id };
              }
            } finally {
              closed = true;
            }
          }

          const error = await sqlDuck
            .toTable({
              table: testTable,
              schema,
              rowStream: rows(),
              chunkSize: 10,
              autoCheckpoint: false,
              signal: controller.signal,
              createOptions: { create: "CREATE_OR_REPLACE" },
            })
            .catch((error: unknown) => error);
          expect(error).toBe(controller.signal.reason);
          expect(error).toMatchObject({ name: "AbortError" });
          expect(closed).toBe(true);

          // The 2 full chunks appended before the abort are kept
          const query = await conn.runAndReadAll(
            `SELECT count(*) as count_star from ${testTable.getFullName()}`
          );
          expect(query.getRowObjects()).toStrictEqual([{ count_star: 20n }]);
        });

        it("Should reject before creating the table when already aborted", async () => {
          const sqlDuck = new SqlDuck({ conn });
          const testTable = new Table({ name: "test_abort_before_start" });
          const reason = new Error("cancelled");
          await expect(
            sqlDuck.toTable({
              table: testTable,
              schema,
              rowStream: [{ id: 1 }][Symbol.iterator]() as Generator<{
                id: number;
              }>,
              autoCheckpoint: false,
              signal: AbortSignal.abort(reason),
            })
          ).rejects.toBe(reason);
          const query = await conn.runAndReadAll(
            `SELECT count(*) as count_star FROM duckdb_tables() WHERE table_name = 'test_abort_before_start'`
          );
          expect(query.getRowObjects()).toStrictEqual([{ count_star: 0n }]);
        });
      });

      it("Should append uuid and bigint list columns", async () => {
        const sqlDuck = new SqlDuck({ conn });
        const testTable = new Table("test_uuid_and_lists");
        const uuid = "019d2155-d292-71fa-87d7-9d1f1ed83569";
        const highBitUuid = "ffffffff-ffff-ffff-ffff-ffffffffffff";

        async function* rowStream() {
          yield {
            id: 1,
            uuid_v7: uuid,
            nullable_uuid: highBitUuid,
            list_of_numbers: [1, 2],
            list_of_bigints: ["9223372036854775807", "-1"],
          };
          yield {
            id: 2,
            uuid_v7: highBitUuid,
            nullable_uuid: null,
            list_of_numbers: [],
            list_of_bigints: [],
          };
        }

        const { totalRows } = await sqlDuck.toTable({
          table: testTable,
          schema: z.strictObject({
            id: z.int32(),
            uuid_v7: z.uuidv7(),
            nullable_uuid: z.nullable(z.uuid()),
            list_of_numbers: z.array(z.number()),
            list_of_bigints: z.array(zodCodecs.bigintToString).meta({
              duckdbType: "BIGINT[]",
            }),
          }),
          rowStream: rowStream(),
          autoCheckpoint: false,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        expect(totalRows).toBe(2);
        const query = await conn.runAndReadAll(
          `SELECT uuid_v7::VARCHAR as uuid_v7,
                  nullable_uuid::VARCHAR as nullable_uuid,
                  typeof(list_of_numbers) as list_of_numbers_type,
                  list_of_numbers::VARCHAR as list_of_numbers,
                  list_of_bigints::VARCHAR as list_of_bigints
           FROM ${testTable.getFullName()} ORDER BY id`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            uuid_v7: uuid,
            nullable_uuid: highBitUuid,
            list_of_numbers_type: "BIGINT[]",
            list_of_numbers: "[1, 2]",
            list_of_bigints: "[9223372036854775807, -1]",
          },
          {
            uuid_v7: highBitUuid,
            nullable_uuid: null,
            list_of_numbers_type: "BIGINT[]",
            list_of_numbers: "[]",
            list_of_bigints: "[]",
          },
        ]);
      });

      it("Should infer list item types from string formats", async () => {
        const sqlDuck = new SqlDuck({ conn });
        const testTable = new Table("test_list_string_formats");
        const uuid = "019d2155-d292-71fa-87d7-9d1f1ed83569";

        async function* rowStream() {
          yield {
            uuids: [uuid],
            dates: ["2025-01-02"],
            timestamps: ["2025-01-02T03:04:05.678Z"],
            bigints: ["9223372036854775807", "-1"],
          };
        }

        const { createTableDDL } = await sqlDuck.toTable({
          table: testTable,
          schema: z.strictObject({
            uuids: z.array(z.uuid()),
            dates: z.array(z.iso.date()),
            timestamps: z.array(z.iso.datetime()),
            bigints: z.array(zodCodecs.bigintToString),
          }),
          rowStream: rowStream(),
          autoCheckpoint: false,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        expect(createTableDDL).toContain("uuids UUID[] NOT NULL");
        expect(createTableDDL).toContain("dates DATE[] NOT NULL");
        expect(createTableDDL).toContain("timestamps TIMESTAMP_MS[] NOT NULL");
        expect(createTableDDL).toContain("bigints BIGINT[] NOT NULL");
        const query = await conn.runAndReadAll(
          `SELECT uuids::VARCHAR as uuids,
                  dates::VARCHAR as dates,
                  timestamps::VARCHAR as timestamps,
                  bigints::VARCHAR as bigints
           FROM ${testTable.getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            uuids: `[${uuid}]`,
            dates: "[2025-01-02]",
            timestamps: "['2025-01-02 03:04:05.678']",
            bigints: "[9223372036854775807, -1]",
          },
        ]);
      });

      it("Should append TIMESTAMP columns", async () => {
        const sqlDuck = new SqlDuck({ conn });
        const testTable = new Table("test_timestamps");
        const date = new Date("2025-01-02T03:04:05.678Z");

        async function* rowStream() {
          yield {
            id: 1,
            ts: "2025-01-02T03:04:05.678Z",
            ts_list: ["2025-01-02T03:04:05.678Z"],
          };
          yield { id: 2, ts: date.getTime(), ts_list: [] };
          yield { id: 3, ts: null, ts_list: null };
        }

        await sqlDuck.toTable({
          table: testTable,
          schema: z.strictObject({
            id: z.int32(),
            ts: z.nullable(
              z
                .union([z.string(), z.number()])
                .meta({ duckdbType: "TIMESTAMP" })
            ),
            ts_list: z.nullable(
              z.array(z.string()).meta({ duckdbType: "TIMESTAMP[]" })
            ),
          }),
          rowStream: rowStream(),
          autoCheckpoint: false,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        const query = await conn.runAndReadAll(
          `SELECT typeof(ts) as ts_type, ts::VARCHAR as ts,
                  ts_list::VARCHAR as ts_list
           FROM ${testTable.getFullName()} ORDER BY id`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            ts_type: "TIMESTAMP",
            ts: "2025-01-02 03:04:05.678",
            ts_list: "['2025-01-02 03:04:05.678']",
          },
          {
            ts_type: "TIMESTAMP",
            ts: "2025-01-02 03:04:05.678",
            ts_list: "[]",
          },
          { ts_type: "TIMESTAMP", ts: null, ts_list: null },
        ]);
      });

      it("Should append decimal columns with their declared width and scale", async () => {
        const sqlDuck = new SqlDuck({ conn });
        const testTable = new Table("test_decimals");

        async function* rowStream() {
          yield {
            id: 1,
            price: 1.235,
            rate: 1.2345678912,
            default_dec: 1.2345,
          };
          yield { id: 2, price: -99_999_999.99, rate: null, default_dec: 0 };
        }

        const { totalRows } = await sqlDuck.toTable({
          table: testTable,
          schema: z.strictObject({
            id: z.int32(),
            price: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
            rate: z.nullable(z.number().meta({ duckdbType: "DECIMAL(38,10)" })),
            default_dec: z.number().meta({ duckdbType: "DECIMAL" }),
          }),
          rowStream: rowStream(),
          autoCheckpoint: false,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        expect(totalRows).toBe(2);
        const query = await conn.runAndReadAll(
          `SELECT typeof(price) as price_type,
                  price::VARCHAR as price,
                  typeof(rate) as rate_type,
                  rate::VARCHAR as rate,
                  default_dec::VARCHAR as default_dec
           FROM ${testTable.getFullName()} ORDER BY id`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            price_type: "DECIMAL(10,2)",
            price: "1.24",
            rate_type: "DECIMAL(38,10)",
            rate: "1.2345678912",
            default_dec: "1.235",
          },
          {
            price_type: "DECIMAL(10,2)",
            price: "-99999999.99",
            rate_type: "DECIMAL(38,10)",
            rate: null,
            default_dec: "0.000",
          },
        ]);
      });

      it("Should append decimal columns inferred from multipleOf", async () => {
        const sqlDuck = new SqlDuck({ conn });
        const testTable = new Table("test_decimals_multiple_of");

        async function* rowStream() {
          yield { id: 1, price: 999.99, tiny: 0.0000003, huge: 1.5e20 };
          yield { id: 2, price: 0, tiny: -1.2345678, huge: 12.34 };
        }

        await sqlDuck.toTable({
          table: testTable,
          schema: z.strictObject({
            id: z.int32(),
            price: z.number().multipleOf(0.01).min(0).max(999.99),
            tiny: z.number().multipleOf(1e-7),
            huge: z.number().multipleOf(0.01).min(0).max(1e25),
          }),
          rowStream: rowStream(),
          autoCheckpoint: false,
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        });

        const query = await conn.runAndReadAll(
          `SELECT typeof(price) as price_type, price::VARCHAR as price,
                  typeof(tiny) as tiny_type, tiny::VARCHAR as tiny,
                  typeof(huge) as huge_type, huge::VARCHAR as huge
           FROM ${testTable.getFullName()} ORDER BY id`
        );
        expect(query.getRowObjects()).toStrictEqual([
          {
            price_type: "DECIMAL(18,2)",
            price: "999.99",
            tiny_type: "DECIMAL(18,7)",
            tiny: "0.0000003",
            huge_type: "DECIMAL(28,2)",
            huge: "150000000000000000000.00",
          },
          {
            price_type: "DECIMAL(18,2)",
            price: "0.00",
            tiny_type: "DECIMAL(18,7)",
            tiny: "-1.2345678",
            huge_type: "DECIMAL(28,2)",
            huge: "12.34",
          },
        ]);
      });

      describe("enum", () => {
        const schema = z.strictObject({
          id: z.int32(),
          status: z.enum(["draft", "published", "archived"]),
          nullable_status: z.nullable(z.enum(["a", "b"])),
        });

        it("Should append enum columns declared inline in the create table", async () => {
          const sqlDuck = new SqlDuck({ conn });
          const testTable = new Table("test_enums");

          async function* rowStream() {
            yield { id: 1, status: "draft", nullable_status: "b" } as const;
            yield { id: 2, status: "archived", nullable_status: null } as const;
          }

          const { totalRows, createTableDDL } = await sqlDuck.toTable({
            table: testTable,
            schema,
            rowStream: rowStream(),
            autoCheckpoint: false,
            createOptions: {
              create: "CREATE_OR_REPLACE",
            },
          });

          expect(totalRows).toBe(2);
          expect(createTableDDL).toContain(
            "status ENUM('draft', 'published', 'archived') NOT NULL"
          );
          const query = await conn.runAndReadAll(
            `SELECT typeof(status) as status_type,
                    status::VARCHAR as status,
                    enum_code(status) as status_code,
                    nullable_status::VARCHAR as nullable_status
             FROM ${testTable.getFullName()} ORDER BY id`
          );
          expect(query.getRowObjects()).toStrictEqual([
            {
              status_type: "ENUM('draft', 'published', 'archived')",
              status: "draft",
              status_code: 0,
              nullable_status: "b",
            },
            {
              status_type: "ENUM('draft', 'published', 'archived')",
              status: "archived",
              status_code: 2,
              nullable_status: null,
            },
          ]);

          // No reusable type is created
          const types = await conn.runAndReadAll(
            `SELECT count(*) as count_star FROM duckdb_types() WHERE internal = false`
          );
          expect(types.getRowObjects()).toStrictEqual([{ count_star: 0n }]);
        });

        it("Should reject a value that is not a member of the enum", async () => {
          const sqlDuck = new SqlDuck({ conn });
          const testTable = new Table("test_enums_invalid");

          async function* rowStream() {
            yield { id: 1, status: "draft", nullable_status: null };
            yield { id: 2, status: "deleted", nullable_status: null };
          }

          await expect(
            sqlDuck.toTable({
              table: testTable,
              schema,
              // @ts-expect-error testing a value outside the enum
              rowStream: rowStream(),
              autoCheckpoint: false,
              createOptions: {
                create: "CREATE_OR_REPLACE",
              },
            })
          ).rejects.toThrow(
            "Failed to append data into table 'test_enums_invalid' - 'deleted' is not a member of ENUM('draft', 'published', 'archived')"
          );

          // The chunk holding the invalid value isn't appended
          const query = await conn.runAndReadAll(
            `SELECT count(*) as count_star from ${testTable.getFullName()}`
          );
          expect(query.getRowObjects()).toStrictEqual([{ count_star: 0n }]);
        });

        describe("list of enums", () => {
          const listSchema = z.strictObject({
            id: z.int32(),
            tags: z.nullable(z.array(z.enum(["red", "green", "blue"]))),
          });

          it("Should append list of enums columns", async () => {
            const sqlDuck = new SqlDuck({ conn });
            const testTable = new Table("test_enum_lists");

            async function* rowStream(): AsyncGenerator<
              z.input<typeof listSchema>
            > {
              yield { id: 1, tags: ["red", "blue"] };
              yield { id: 2, tags: [] };
              yield { id: 3, tags: null };
            }

            const { createTableDDL } = await sqlDuck.toTable({
              table: testTable,
              schema: listSchema,
              rowStream: rowStream(),
              autoCheckpoint: false,
              createOptions: {
                create: "CREATE_OR_REPLACE",
              },
            });

            expect(createTableDDL).toContain(
              "tags ENUM('red', 'green', 'blue')[]"
            );
            const query = await conn.runAndReadAll(
              `SELECT typeof(tags) as tags_type, tags::VARCHAR as tags
               FROM ${testTable.getFullName()} ORDER BY id`
            );
            expect(query.getRowObjects()).toStrictEqual([
              {
                tags_type: "ENUM('red', 'green', 'blue')[]",
                tags: "[red, blue]",
              },
              { tags_type: "ENUM('red', 'green', 'blue')[]", tags: "[]" },
              { tags_type: "ENUM('red', 'green', 'blue')[]", tags: null },
            ]);
          });

          it("Should reject a list item that is not a member of the enum", async () => {
            const sqlDuck = new SqlDuck({ conn });

            async function* rowStream() {
              yield { id: 1, tags: ["red", "purple"] };
            }

            await expect(
              sqlDuck.toTable({
                table: new Table("test_enum_lists_invalid"),
                schema: listSchema,
                // @ts-expect-error testing a value outside the enum
                rowStream: rowStream(),
                autoCheckpoint: false,
                createOptions: {
                  create: "CREATE_OR_REPLACE",
                },
              })
            ).rejects.toThrow(
              "'purple' is not a member of ENUM('red', 'green', 'blue')"
            );
          });
        });
      });
    },
    testTimeout * 2
  );

  describe("Logger", () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configureTestLogger(logBuffer);
    });

    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it("should log success", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attachIfNotExists({
        type: "memory",
        alias: "sql_duck_test",
      });
      const sqlDuck = new SqlDuck({ conn });
      const rowStream = async function* gen() {
        yield { id: "test" };
        yield await Promise.resolve({ id: "test2" });
      };
      await sqlDuck.toTable({
        table: new Table({
          name: "test",
          database: database.alias,
        }),
        schema: z.object({
          id: z.string(),
        }),
        rowStream: rowStream(),
        createOptions: {
          create: "CREATE_OR_REPLACE",
        },
      });
      expect(logBuffer.at(-1)!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: [
          expect.stringMatching(
            /Successfully appended 2 rows into 'sql_duck_test.test' in \d+ms/
          ),
        ],
        level: "info",
        properties: {
          timeMs: expect.any(Number),
          totalRows: 2,
        },
      });
    });

    it("should log error", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attachIfNotExists({
        type: "memory",
        alias: "sql_duck_test",
      });
      const sqlDuck = new SqlDuck({ conn });
      const rowStream = function* gen() {
        yield { id: "not a number" as unknown as number };
      };

      // on nodejs: Cannot convert 1 to a BigInt
      // on bun: Invalid argument type in ToBigInt ope…
      const regexpError =
        /failed to append data into table (.*)test(.*)bigint/i;

      await expect(
        sqlDuck.toTable({
          table: new Table({
            name: "test",
            database: database.alias,
          }),
          schema: z.strictObject({
            id: z.number(),
          }),
          rowStream: rowStream(),
          createOptions: {
            create: "CREATE_OR_REPLACE",
          },
        })
      ).rejects.toThrow(regexpError);

      expect(logBuffer.at(-1)!).toMatchObject({
        category: flowbladeLogtapeSqlduckConfig.categories,
        message: [expect.stringMatching(regexpError)],
        level: "error",
      });
    });
  });
});

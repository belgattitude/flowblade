import type { DuckDBConnection } from "@duckdb/node-api";
import { describe, expect } from "vitest";
import * as z from "zod";

import { createDuckTest } from "#tests/utils/duck-test.ts";
import {
  loadStrategies,
  strategyTableName,
} from "#tests/utils/load-strategies.ts";

import { Table } from "../../../src/index.ts";
import { DuckTableLoader } from "../../../src/loader/index.ts";
import { zodCodecs } from "../../../src/utils/zod-codecs.ts";

const it = createDuckTest({ threads: 1 });

describe.each(loadStrategies)(
  "column types with %s",
  (name, createStrategy) => {
    const loaderOf = (conn: DuckDBConnection) =>
      new DuckTableLoader({ conn, strategy: createStrategy(2048) });
    const tableOf = (base: string) => new Table(strategyTableName(base, name));

    it("should load uuid and bigint list columns", async ({ conn }) => {
      const table = tableOf("uuid_and_lists");
      const uuid = "019d2155-d292-71fa-87d7-9d1f1ed83569";
      const highBitUuid = "ffffffff-ffff-ffff-ffff-ffffffffffff";

      const { totalRows } = await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          id: z.int32(),
          uuid_v7: z.uuidv7(),
          nullable_uuid: z.nullable(z.uuid()),
          list_of_numbers: z.array(z.number()),
          list_of_bigints: z.array(zodCodecs.bigintToString).meta({
            duckdbType: "BIGINT[]",
          }),
        }),
        rows: [
          {
            id: 1,
            uuid_v7: uuid,
            nullable_uuid: highBitUuid,
            list_of_numbers: [1, 2],
            list_of_bigints: ["9223372036854775807", "-1"],
          },
          {
            id: 2,
            uuid_v7: highBitUuid,
            nullable_uuid: null,
            list_of_numbers: [],
            list_of_bigints: [],
          },
        ],
        mode: "createOrReplace",
      });

      expect(totalRows).toBe(2);
      const query = await conn.runAndReadAll(
        `SELECT uuid_v7::VARCHAR as uuid_v7,
              nullable_uuid::VARCHAR as nullable_uuid,
              typeof(list_of_numbers) as list_of_numbers_type,
              list_of_numbers::VARCHAR as list_of_numbers,
              list_of_bigints::VARCHAR as list_of_bigints
       FROM ${table.getFullName()} ORDER BY id`
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

    it("should infer list item types from string formats", async ({ conn }) => {
      const table = tableOf("list_string_formats");
      const uuid = "019d2155-d292-71fa-87d7-9d1f1ed83569";

      const { createTableDDL } = await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          uuids: z.array(z.uuid()),
          dates: z.array(z.iso.date()),
          timestamps: z.array(z.iso.datetime()),
          bigints: z.array(zodCodecs.bigintToString),
        }),
        rows: [
          {
            uuids: [uuid],
            dates: ["2025-01-02"],
            timestamps: ["2025-01-02T03:04:05.678Z"],
            bigints: ["9223372036854775807", "-1"],
          },
        ],
        mode: "createOrReplace",
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
       FROM ${table.getFullName()}`
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

    it("should load TIMESTAMP columns", async ({ conn }) => {
      const table = tableOf("timestamps");
      const date = new Date("2025-01-02T03:04:05.678Z");

      await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          id: z.int32(),
          ts_string: z.nullable(z.string().meta({ duckdbType: "TIMESTAMP" })),
          // Epoch in milliseconds
          ts_epoch: z.nullable(z.number().meta({ duckdbType: "TIMESTAMP" })),
          ts_list: z.nullable(
            z.array(z.string()).meta({ duckdbType: "TIMESTAMP[]" })
          ),
        }),
        rows: [
          {
            id: 1,
            ts_string: "2025-01-02T03:04:05.678Z",
            ts_epoch: date.getTime(),
            ts_list: ["2025-01-02T03:04:05.678Z"],
          },
          {
            id: 2,
            ts_string: "2025-01-02 03:04:05.678",
            ts_epoch: 0,
            ts_list: [],
          },
          { id: 3, ts_string: null, ts_epoch: null, ts_list: null },
        ],
        mode: "createOrReplace",
      });

      const query = await conn.runAndReadAll(
        `SELECT typeof(ts_string) as ts_type, ts_string::VARCHAR as ts_string,
              ts_epoch::VARCHAR as ts_epoch, ts_list::VARCHAR as ts_list
       FROM ${table.getFullName()} ORDER BY id`
      );
      expect(query.getRowObjects()).toStrictEqual([
        {
          ts_type: "TIMESTAMP",
          ts_string: "2025-01-02 03:04:05.678",
          ts_epoch: "2025-01-02 03:04:05.678",
          ts_list: "['2025-01-02 03:04:05.678']",
        },
        {
          ts_type: "TIMESTAMP",
          ts_string: "2025-01-02 03:04:05.678",
          ts_epoch: "1970-01-01 00:00:00",
          ts_list: "[]",
        },
        {
          ts_type: "TIMESTAMP",
          ts_string: null,
          ts_epoch: null,
          ts_list: null,
        },
      ]);
    });

    it("should load decimal columns with their declared width and scale", async ({
      conn,
    }) => {
      const table = tableOf("decimals");

      const { totalRows } = await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          id: z.int32(),
          price: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
          rate: z.nullable(z.number().meta({ duckdbType: "DECIMAL(38,10)" })),
          default_dec: z.number().meta({ duckdbType: "DECIMAL" }),
        }),
        rows: [
          { id: 1, price: 1.235, rate: 1.2345678912, default_dec: 1.2345 },
          { id: 2, price: -99_999_999.99, rate: null, default_dec: 0 },
        ],
        mode: "createOrReplace",
      });

      expect(totalRows).toBe(2);
      const query = await conn.runAndReadAll(
        `SELECT typeof(price) as price_type,
              price::VARCHAR as price,
              typeof(rate) as rate_type,
              rate::VARCHAR as rate,
              default_dec::VARCHAR as default_dec
       FROM ${table.getFullName()} ORDER BY id`
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

    it("should load decimal columns inferred from multipleOf", async ({
      conn,
    }) => {
      const table = tableOf("decimals_multiple_of");

      await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          id: z.int32(),
          price: z.number().multipleOf(0.01).min(0).max(999.99),
          tiny: z.number().multipleOf(1e-7),
          huge: z.number().multipleOf(0.01).min(0).max(1e25),
        }),
        rows: [
          { id: 1, price: 999.99, tiny: 0.0000003, huge: 1.5e20 },
          { id: 2, price: 0, tiny: -1.2345678, huge: 12.34 },
        ],
        mode: "createOrReplace",
      });

      const query = await conn.runAndReadAll(
        `SELECT typeof(price) as price_type, price::VARCHAR as price,
              typeof(tiny) as tiny_type, tiny::VARCHAR as tiny,
              typeof(huge) as huge_type, huge::VARCHAR as huge
       FROM ${table.getFullName()} ORDER BY id`
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

    it("should create VARCHAR columns with the duckdbCollate meta", async ({
      conn,
    }) => {
      const table = tableOf("collate");

      const { totalRows } = await loaderOf(conn).load({
        table,
        schema: z.strictObject({
          id: z.int32(),
          name: z.string().meta({ duckdbCollate: "NOCASE" }),
          code: z.string().meta({ duckdbCollate: "NOCASE.NOACCENT" }),
        }),
        rows: [
          { id: 1, name: "Alice", code: "Éclair" },
          { id: 2, name: "bob", code: "eclair" },
        ],
        mode: "createOrReplace",
      });

      expect(totalRows).toBe(2);
      const fq = table.getFullName();
      const query = await conn.runAndReadAll(
        `SELECT
         (SELECT id FROM ${fq} WHERE name = 'ALICE') as nocase_match,
         (SELECT count(*) FROM ${fq} WHERE name = 'alice') as nocase_count,
         (SELECT count(*) FROM ${fq} WHERE code = 'ECLAIR') as noaccent_count,
         (SELECT count(DISTINCT code) FROM ${fq}) as distinct_codes`
      );
      expect(query.getRowObjectsJson()).toStrictEqual([
        {
          nocase_match: 1,
          nocase_count: "1",
          noaccent_count: "2",
          distinct_codes: "1",
        },
      ]);
    });

    describe("enum", () => {
      const schema = z.strictObject({
        id: z.int32(),
        status: z.enum(["draft", "published", "archived"]),
        nullable_status: z.nullable(z.enum(["a", "b"])),
      });

      it("should load enum columns declared inline in the create table", async ({
        conn,
      }) => {
        const table = tableOf("enums");

        const { totalRows, createTableDDL } = await loaderOf(conn).load({
          table,
          schema,
          rows: [
            { id: 1, status: "draft", nullable_status: "b" },
            { id: 2, status: "archived", nullable_status: null },
          ],
          mode: "createOrReplace",
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
         FROM ${table.getFullName()} ORDER BY id`
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

      it("should reject a value that is not a member of the enum", async ({
        conn,
      }) => {
        await expect(
          loaderOf(conn).load({
            table: tableOf("enums_invalid"),
            schema,
            // @ts-expect-error testing a value outside the enum
            rows: [
              { id: 1, status: "draft", nullable_status: null },
              { id: 2, status: "deleted", nullable_status: null },
            ],
            mode: "createOrReplace",
          })
        ).rejects.toThrow(
          "'deleted' is not a member of ENUM('draft', 'published', 'archived')"
        );

        // The rows before the invalid value aren't kept either
        const query = await conn.runAndReadAll(
          `SELECT count(*) as count_star FROM ${tableOf("enums_invalid").getFullName()}`
        );
        expect(query.getRowObjects()).toStrictEqual([{ count_star: 0n }]);
      });

      describe("list of enums", () => {
        const listSchema = z.strictObject({
          id: z.int32(),
          tags: z.nullable(z.array(z.enum(["red", "green", "blue"]))),
        });

        it("should load list of enums columns", async ({ conn }) => {
          const table = tableOf("enum_lists");

          const { createTableDDL } = await loaderOf(conn).load({
            table,
            schema: listSchema,
            rows: [
              { id: 1, tags: ["red", "blue"] },
              { id: 2, tags: [] },
              { id: 3, tags: null },
            ],
            mode: "createOrReplace",
          });

          expect(createTableDDL).toContain(
            "tags ENUM('red', 'green', 'blue')[]"
          );
          const query = await conn.runAndReadAll(
            `SELECT typeof(tags) as tags_type, tags::VARCHAR as tags
           FROM ${table.getFullName()} ORDER BY id`
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

        it("should reject a list item that is not a member of the enum", async ({
          conn,
        }) => {
          await expect(
            loaderOf(conn).load({
              table: tableOf("enum_lists_invalid"),
              schema: listSchema,
              // @ts-expect-error testing a value outside the enum
              rows: [{ id: 1, tags: ["red", "purple"] }],
              mode: "createOrReplace",
            })
          ).rejects.toThrow(
            "'purple' is not a member of ENUM('red', 'green', 'blue')"
          );
        });
      });
    });
  }
);

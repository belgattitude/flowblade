import {
  BIGINT,
  BOOLEAN,
  DATE,
  DECIMAL,
  DOUBLE,
  ENUM,
  FLOAT,
  INTEGER,
  LIST,
  TIMESTAMP_MS,
  TINYINT,
  UUID,
  VARCHAR,
} from "@duckdb/node-api";
import type { DuckDBType } from "@duckdb/node-api";
import { duckdb as duckDbDialect, formatDialect } from "sql-formatter";
import { expectTypeOf, describe, expect, it } from "vitest";
import * as z from "zod";

import { testFullSupportedColumnsZodSchema } from "#tests/data/test-full-supported-columns-zod-schema.ts";

import { Table } from "../objects/table.ts";
import { getTableCreateFromZod } from "./get-table-create-from-zod.ts";

describe(getTableCreateFromZod, () => {
  describe("DDL", () => {
    describe("when create or replace is specified", () => {
      it("should return a valid create table from the schema", () => {
        const { ddl } = getTableCreateFromZod({
          table: new Table("test"),
          schema: testFullSupportedColumnsZodSchema,
          options: {
            create: "CREATE_OR_REPLACE",
          },
        });

        const duckdbFmtDialect = {
          dialect: duckDbDialect,
          useTabs: false,
          tabWidth: 2,
        };

        expect(formatDialect(ddl, duckdbFmtDialect)).toStrictEqual(
          formatDialect(
            `
               CREATE OR REPLACE TABLE test (
                id BIGINT PRIMARY KEY,
                name VARCHAR NOT NULL,
                email VARCHAR,
                js_number BIGINT NOT NULL,
                js_number_tinyint TINYINT NOT NULL,
                js_number_int32 INTEGER NOT NULL,
                js_float_float64 DOUBLE NOT NULL,
                js_float_float32 FLOAT NOT NULL,
                bignumber BIGINT,
                created_at TIMESTAMP_MS NOT NULL,
                is_active BOOLEAN,
                alt_uuid_v7 UUID NOT NULL,
                custom_type UUID NOT NULL,
                custom_date_only_type DATE NOT NULL,
                iso_date DATE NOT NULL,
                js_enum ENUM('a', 'b', 'c') NOT NULL,
                decimal_18_3 DECIMAL(18, 3) NOT NULL,
                list_of_strings_explicit VARCHAR[] NOT NULL,
                list_of_strings VARCHAR[] NOT NULL,
                list_of_bigints VARCHAR[] NOT NULL,
                list_of_bigints_explicit BIGINT[] NOT NULL,                
                list_of_numbers BIGINT[] NOT NULL,
                list_of_int32s INTEGER[] NOT NULL,
                list_of_booleans BOOLEAN[] NOT NULL,
                list_of_float32s FLOAT[] NOT NULL,
                list_of_float64s DOUBLE[] NOT NULL
               )`,
            duckdbFmtDialect
          )
        );
      });
    });
  });

  describe("columnTypes", () => {
    it("should return the correct duckdb columnTypes", () => {
      const { columnTypes } = getTableCreateFromZod({
        table: new Table("test"),
        schema: testFullSupportedColumnsZodSchema,
      });
      expectTypeOf(columnTypes).toEqualTypeOf<
        Map<keyof z.infer<typeof testFullSupportedColumnsZodSchema>, DuckDBType>
      >();

      expect([...columnTypes.keys()]).toStrictEqual(
        Object.keys(testFullSupportedColumnsZodSchema.shape)
      );

      expectTypeOf(columnTypes.get("id")!).toEqualTypeOf<DuckDBType>();
      expect(columnTypes.get("js_number")).toBe(BIGINT);
      expect(columnTypes.get("name")).toBe(VARCHAR);

      expect(columnTypes).toStrictEqual(
        new Map<
          keyof z.infer<typeof testFullSupportedColumnsZodSchema>,
          DuckDBType
        >([
          ["id", BIGINT],
          ["name", VARCHAR],
          ["email", VARCHAR],
          ["js_number", BIGINT],
          ["js_number_tinyint", TINYINT],
          ["js_number_int32", INTEGER],
          ["js_float_float64", DOUBLE],
          ["js_float_float32", FLOAT],
          ["bignumber", BIGINT],
          ["created_at", TIMESTAMP_MS],
          ["is_active", BOOLEAN],
          ["alt_uuid_v7", UUID],
          ["custom_type", UUID],
          ["custom_date_only_type", DATE],
          ["iso_date", DATE],
          ["js_enum", ENUM(["a", "b", "c"])],
          ["decimal_18_3", DECIMAL(18, 3)],
          ["list_of_strings_explicit", LIST(VARCHAR)],
          ["list_of_strings", LIST(VARCHAR)],
          ["list_of_bigints", LIST(VARCHAR)],
          ["list_of_bigints_explicit", LIST(BIGINT)],
          ["list_of_numbers", LIST(BIGINT)],
          ["list_of_int32s", LIST(INTEGER)],
          ["list_of_float32s", LIST(FLOAT)],
          ["list_of_float64s", LIST(DOUBLE)],
          ["list_of_booleans", LIST(BOOLEAN)],
        ])
      );
    });
  });
  describe("When zod schema contains unsupported schemas", () => {
    it("should fail with an error", () => {
      const schema = z.object({
        nestedObject: z.object({
          id: z.number(),
        }),
      });
      expect(() =>
        getTableCreateFromZod({
          table: new Table("test_case"),
          // @ts-expect-error schema cannot contain a nested object
          schema: schema,
        })
      ).toThrow("Cannot guess 'nestedObject' type");
    });
  });
  describe("When duckdbType is an explicit DECIMAL(width,scale)", () => {
    it("should use the provided width and scale", () => {
      const { ddl, columnTypes } = getTableCreateFromZod({
        table: new Table("test"),
        schema: z.object({
          price: z.number().meta({ duckdbType: "DECIMAL(10,2)" }),
          rate: z.number().meta({ duckdbType: "decimal( 38, 10 )" }),
          amount: z.number().meta({ duckdbType: "DECIMAL" }),
        }),
      });
      expect(columnTypes.get("price")).toStrictEqual(DECIMAL(10, 2));
      expect(columnTypes.get("rate")).toStrictEqual(DECIMAL(38, 10));
      expect(columnTypes.get("amount")).toStrictEqual(DECIMAL(18, 3));
      expect(ddl).toContain("price DECIMAL(10,2) NOT NULL");
      expect(ddl).toContain("rate DECIMAL(38,10) NOT NULL");
    });

    it("should fail when width or scale are out of range", () => {
      for (const duckdbType of [
        "DECIMAL(39,2)",
        "DECIMAL(0,0)",
        "DECIMAL(4,5)",
      ]) {
        expect(() =>
          getTableCreateFromZod({
            table: new Table("test"),
            schema: z.object({ price: z.number().meta({ duckdbType }) }),
          })
        ).toThrow(/Invalid duckdbType/);
      }
    });
  });
  describe("When the zod schema uses multipleOf", () => {
    it("should infer the DECIMAL width and scale", () => {
      const { columnTypes } = getTableCreateFromZod({
        table: new Table("test"),
        schema: z.object({
          price: z.number().multipleOf(0.01).min(0).max(999.99),
          tiny: z.number().multipleOf(1e-7),
          huge: z.number().multipleOf(0.01).min(0).max(1e25),
          list: z.array(z.number().multipleOf(0.5)),
        }),
      });
      expect(columnTypes.get("price")).toStrictEqual(DECIMAL(18, 2));
      expect(columnTypes.get("tiny")).toStrictEqual(DECIMAL(18, 7));
      expect(columnTypes.get("huge")).toStrictEqual(DECIMAL(28, 2));
      expect(columnTypes.get("list")).toStrictEqual(LIST(DECIMAL(18, 1)));
    });
  });
});

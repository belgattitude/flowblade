import {
  BIGINT,
  BOOLEAN,
  DOUBLE,
  type DuckDBType,
  ENUM,
  FLOAT,
  INTEGER,
  TIMESTAMP_MS,
  TINYINT,
  UUID,
  VARCHAR,
} from '@duckdb/node-api';
import { duckdb as duckDbDialect, formatDialect } from 'sql-formatter';
import * as z from 'zod';

import { testFullSupportedColumnsZodSchema } from '@/tests/data/test-full-supported-columns-zod-schema.ts';

import { Table } from '../objects/table.ts';
import { getTableCreateFromZod } from './get-table-create-from-zod.ts';

describe('getTableCreateFromZod', () => {
  describe('DDL', () => {
    describe('when create or replace is specified', () => {
      it('should return a valid create table from the schema', () => {
        const { ddl } = getTableCreateFromZod({
          table: new Table('test'),
          schema: testFullSupportedColumnsZodSchema,
          options: {
            create: 'CREATE_OR_REPLACE',
          },
        });
        expect(ddl).toStrictEqual(
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
                js_enum ENUM('a', 'b', 'c') NOT NULL
               )`,
            {
              dialect: duckDbDialect,
              useTabs: false,
              tabWidth: 2,
            }
          )
        );
      });
    });
  });

  describe('columnTypes', () => {
    it('should return the correct duckdb columnTypes', () => {
      const { columnTypes } = getTableCreateFromZod({
        table: new Table('test'),
        schema: testFullSupportedColumnsZodSchema,
      });
      expectTypeOf(columnTypes).toEqualTypeOf<
        Map<keyof typeof testFullSupportedColumnsZodSchema.shape, DuckDBType>
      >();

      expect([...columnTypes.keys()]).toStrictEqual(
        Object.keys(testFullSupportedColumnsZodSchema.shape)
      );

      expectTypeOf(columnTypes.get('id')!).toEqualTypeOf<DuckDBType>();
      expect(columnTypes.get('js_number')).toBe(BIGINT);
      expect(columnTypes.get('name')).toBe(VARCHAR);

      expect(columnTypes).toStrictEqual(
        new Map<
          keyof typeof testFullSupportedColumnsZodSchema.shape,
          DuckDBType
        >([
          ['id', BIGINT],
          ['name', VARCHAR],
          ['email', VARCHAR],
          ['js_number', BIGINT],
          ['js_number_tinyint', TINYINT],
          ['js_number_int32', INTEGER],
          ['js_float_float64', DOUBLE],
          ['js_float_float32', FLOAT],
          ['bignumber', BIGINT],
          ['created_at', TIMESTAMP_MS],
          ['is_active', BOOLEAN],
          ['alt_uuid_v7', UUID],
          ['custom_type', UUID],
          ['js_enum', ENUM(['a', 'b', 'c'])],
        ])
      );
    });
  });
  describe('When zod schema contains unsupported schemas', () => {
    it('should fail with an error', () => {
      const schema = z.object({
        nestedObject: z.object({
          id: z.number(),
        }),
      });
      expect(() =>
        getTableCreateFromZod({
          table: new Table('test_case'),
          // @ts-expect-error schema cannot contain a nested object
          schema: schema,
        })
      ).toThrowError();
    });
  });
});

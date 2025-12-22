import { BIGINT, INTEGER, TIMESTAMP, VARCHAR } from '@duckdb/node-api';
import { duckdb as duckDbDialect, formatDialect } from 'sql-formatter';
import * as z from 'zod';

import { zodCodecs } from '../utils/zod-codecs';
import { getTableCreateFromZod } from './get-table-create-from-zod';
import { Table } from './table';

describe('getTableCreateFromZod', () => {
  const { dateToString, bigintToString } = zodCodecs;
  const userSchema = z.object({
    id: z.number().meta({ primaryKey: true }),
    name: z.string(),
    email: z.email().nullable(),
    bignumber: z.nullable(bigintToString),
    created_at: dateToString,
  });

  it('should return a correct table creation ddl', () => {
    const { ddl } = getTableCreateFromZod(new Table('test'), userSchema, {
      create: 'CREATE_OR_REPLACE',
    });
    expect(ddl).toStrictEqual(
      formatDialect(
        `
         CREATE OR REPLACE TABLE test (
           id INTEGER PRIMARY KEY, 
           name VARCHAR NOT NULL, 
           email VARCHAR, 
           bignumber BIGINT,
           created_at TIMESTAMP NOT NULL
         )
       `,
        {
          dialect: duckDbDialect,
          useTabs: false,
          tabWidth: 2,
        }
      )
    );
  });

  it('should return the correct column duckdb datatypes', () => {
    const { columnTypes } = getTableCreateFromZod(
      new Table('test'),
      userSchema
    );
    expect(columnTypes).toStrictEqual([
      ['id', INTEGER],
      ['name', VARCHAR],
      ['email', VARCHAR],
      ['bignumber', BIGINT],
      ['created_at', TIMESTAMP],
    ]);
  });
});

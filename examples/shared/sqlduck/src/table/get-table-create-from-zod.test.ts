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

  expect(
    getTableCreateFromZod(
      new Table({
        name: 'test',
        // schema: 'main',
      }),
      userSchema
    )
  ).toStrictEqual(
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

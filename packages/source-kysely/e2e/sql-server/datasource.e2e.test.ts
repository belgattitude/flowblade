import { sql } from 'kysely';

import {
  assertQueryResultError,
  assertQueryResultSuccess,
  type QueryResultError,
} from '../../src';
import { createE2eDatasource } from '../utils/create-e2e-datasource';

describe('Datasource sqlserver', () => {
  const ds = createE2eDatasource('sql-server');
  describe('Kysely raw queries', () => {
    it('01. basicQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT 1 as one`;
      const result = await ds.queryRaw(rawSql);
      assertQueryResultSuccess(result);
      const stabletimeMs = 0.1;
      result.meta!.timeMs = stabletimeMs;
      expect(result).toStrictEqual({
        data: [
          {
            one: 1,
          },
        ],
        success: true,
        meta: {
          affectedRows: 1,
          timeMs: stabletimeMs,
          query: {
            params: [],
            sql: 'SELECT 1 as one',
          },
        },
      });
      assertType<Row[]>(result.data);
    });

    it('02. errorQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT FROM 1 as invalid_query`;
      const result = await ds.queryRaw(rawSql);
      assertQueryResultError(result);
      // const stabletimeMs = 0.1;
      // result.meta!.timeMs = stabletimeMs;
      expect(result).toStrictEqual({
        success: false,
        error: {
          message: "Query failed: Incorrect syntax near the keyword 'FROM'.",
        },
        meta: {
          query: {
            params: [],
            sql: 'SELECT FROM 1 as invalid_query',
          },
        },
      });
      assertType<QueryResultError>(result);
    });

    it('03. basicQuery with params', async () => {
      type Row = {
        one: number;
      };
      const params = {
        number: 1,
        string: 'Hello',
      };

      const rawSql = sql<Row>`
          SELECT 1 as one
          WHERE 1 = ${params.number}
          AND 'Hello' like ${params.string}
      `;
      const rows = await ds.queryRaw(rawSql);
      assertQueryResultSuccess(rows);
      const stabletimeMs = 0.1;
      rows.meta!.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });
  });

  describe.skip('Kysely select queries', () => {
    it('upsert some brand', async () => {
      const params = [
        { name: 'Brand A' },
        { name: 'Brand B' },
        { name: 'Brand C' },
      ];
      const qRaw = sql`
        DELETE FROM brand WHERE 1=1;    
        INSERT INTO brand (name, created_at) VALUES (
            SELECT name, CURRENT_TIMESTAMP
            FROM OPENJSON(${JSON.stringify(params)}) WITH (
                name NVARCHAR(255)
            )
        )      
      `;
      expect(await ds.queryRaw(qRaw)).toMatchSnapshot();
    });

    it('get some brands', async () => {
      const query = ds.queryBuilder
        .selectFrom('brand as b')
        .select(['b.id', 'b.name'])
        .leftJoin('product as p', 'p.brand_id', 'b.id')
        .select(['p.id as product_id', 'p.name as product_name'])
        .where('b.created_at', '<', new Date())
        .orderBy('b.name', 'desc');

      const rows = await ds.query(query);
      assertQueryResultSuccess(rows);
      const stabletimeMs = 0.1;
      rows.meta!.timeMs = stabletimeMs;
      expect(rows).toMatchSnapshot();
    });
  });
});

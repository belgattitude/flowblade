import { type InferResult, sql } from 'kysely';
import { expectTypeOf } from 'vitest';

import { createE2eDatasource } from '../utils/create-e2e-datasource';

describe('Datasource sqlserver', () => {
  const ds = createE2eDatasource('sql-server');
  describe('Kysely raw queries', () => {
    it('01. basicQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT 1 as one`;
      const result = await ds.query(rawSql);

      expect(result.isOk()).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.data).toStrictEqual([{ one: 1 }]);
      expectTypeOf(result.data!).toEqualTypeOf<Row[]>();
    });

    it('02. errorQuery', async () => {
      type Row = {
        one: number;
      };

      const rawSql = sql<Row>`SELECT FROM 1 as invalid_query`;
      const result = await ds.query(rawSql, {
        name: 'Error query',
      });

      expect(result.isOk()).toBe(false);

      expect(result.data).toBeUndefined();
      expect(result.error).toStrictEqual({
        message: "Incorrect syntax near the keyword 'FROM'.",
      });
      const firstSpan = result.meta.getSpans()[0]!;
      const { timeMs: _t, ...restFirstSpan } = firstSpan;
      expect(restFirstSpan).toMatchSnapshot();
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
      const result = await ds.query(rawSql, {
        name: 'Retrieve something',
      });

      expect(result.isOk()).toBe(true);
      expect(result.data).toStrictEqual([{ one: 1 }]);
      expectTypeOf(result.data!).toEqualTypeOf<Row[]>();
      const firstSpan = result.meta.getSpans()[0]!;
      const { timeMs: _t, ...restFirstSpan } = firstSpan;
      expect(restFirstSpan).toMatchSnapshot();
    });

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
      const result = await ds.query(qRaw);
      const { data } = result;
      expect(data).toMatchSnapshot('data');
    });
  });

  describe('Kysely with query builder', () => {
    it('select: get some brands', async () => {
      const query = ds.queryBuilder
        .selectFrom('brand as b')
        .select(['b.id', 'b.name'])
        .leftJoin('product as p', 'p.brand_id', 'b.id')
        .select(['p.id as product_id', 'p.name as product_name'])
        .where(
          'b.created_at',
          '<',
          new Date(Date.parse('2025-01-09T23:30:57.701Z'))
        )
        .orderBy('b.name', 'desc');

      const result = await ds.query(query, {
        name: 'get-some-brands',
      });

      const { data, meta, error } = result;

      expect(error).toBeUndefined();
      expect(meta.getSpans().length).toBe(1);
      expect(data).toMatchSnapshot('data');
      const firstSpan = result.meta.getSpans()[0]!;
      const { timeMs: _t, ...restFirstSpan } = firstSpan;
      expect(restFirstSpan).toMatchSnapshot('meta');
      expectTypeOf(data!).toEqualTypeOf<InferResult<typeof query>>();
    });
  });
});

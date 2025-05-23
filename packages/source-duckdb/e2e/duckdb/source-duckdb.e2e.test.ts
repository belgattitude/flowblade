import { afterEach, beforeEach, expectTypeOf } from 'vitest';

import { DuckdbDatasource, sql } from '../../src';
import { createDuckDBE2EMemoryDb } from '../utils/create-duckdb-e2e-memory-db';

describe('DuckDBAsyncDatasource e2e', async () => {
  let ds: DuckdbDatasource;

  beforeEach(async () => {
    const duckdb = await createDuckDBE2EMemoryDb();
    ds = new DuckdbDatasource({ connection: duckdb });
  });

  afterEach(() => {
    ds.getConnection().closeSync();
  });

  describe('query', () => {
    const params = {
      min: 10,
      max: 99,
      name: 'test',
      createdAt: '2025-01-22T23:54:41.114Z',
    };

    type Row = { id: number; name: 'test'; createdAt: Date };

    const rawSql = sql<Row>`

      WITH products(productId, createdAt)
          AS MATERIALIZED (
               FROM RANGE(1,100) SELECT 
               range::INT,
               TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
          )
      
      SELECT productId, 
             ${params.name} as name,
             createdAt
             
      FROM products 
      WHERE productId BETWEEN ${params.min}::INTEGER AND ${params.max}::INTEGER
      AND createdAt < ${params.createdAt}::TIMESTAMPTZ
    `;

    it('should return expected data', async () => {
      const result = await ds.query(rawSql);
      // throw new Error('cool');
      const { data, error } = result;

      expect(error).toBeUndefined();
      expect(data!.length).toBe(90);
      expect(data).toMatchSnapshot();
      expectTypeOf(data!).toEqualTypeOf<Row[]>();
    });

    it('should return expected meta', async () => {
      const result = await ds.query(rawSql);
      const { meta } = result;
      expect(meta.getSpans().length).toBe(1);
      expect(
        meta.getSpans().map((span) => {
          return {
            ...span,
            timeMs: 0,
          };
        })
      ).toMatchSnapshot();
    });
  });
});

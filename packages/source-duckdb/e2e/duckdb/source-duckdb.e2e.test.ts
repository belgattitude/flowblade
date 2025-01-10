import { sql } from '@flowblade/sql-tag';
import { afterEach, beforeEach, expectTypeOf } from 'vitest';

import { DuckdbDatasource } from '../../src';
import { createDuckDBE2EMemoryDb } from '../utils/create-duckdb-e2e-memory-db';

describe('DuckDBAsyncDatasource e2e', async () => {
  let datasource: DuckdbDatasource;

  beforeEach(async () => {
    const duckdb = await createDuckDBE2EMemoryDb();
    datasource = new DuckdbDatasource({ connection: duckdb });
  });

  afterEach(async () => {
    await datasource.getConnection().close();
  });

  it('should return data', async () => {
    const ds = datasource;

    const params = {
      min: 10,
      max: 99,
    };

    const rawSql = sql<{ id: number }>`

      WITH products(productId) 
          AS MATERIALIZED (SELECT COLUMNS(*)::INTEGER FROM RANGE(1,100))
      
      SELECT productId FROM products 
      WHERE productId between ${params.min}::INTEGER and ${params.max}::INTEGER

    `;

    const result = await ds.query(rawSql);

    const { data, meta, error } = result;

    expect(error).toBeUndefined();
    expect(data!.length).toBe(90);
    expect(meta.getSpans().length).toBe(1);
    expectTypeOf(data!).toEqualTypeOf<{ id: number }[]>();
  });
});

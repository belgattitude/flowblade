import { assertQueryResultSuccess } from '@flowblade/core';
import { sql } from '@flowblade/sql-tag';
import { Database } from 'duckdb-async';

import { DuckDBAsyncDatasource } from './datasource/duckdb-async-datasource';

describe('dummy test', async () => {
  const duckdb = await Database.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '512MB',
    threads: '4',
  });

  it('should pass', async () => {
    const ds = new DuckDBAsyncDatasource({ connection: duckdb });

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

    const result = await ds.queryRaw(rawSql);

    assertQueryResultSuccess(result);

    expect(result.data.length).toBe(90);
  });
});

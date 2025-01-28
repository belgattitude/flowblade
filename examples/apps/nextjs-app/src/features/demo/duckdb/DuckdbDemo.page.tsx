'use server';

import { sql, type SqlTag } from '@flowblade/sql-tag';
import type { FC } from 'react';

import { QueryResultDebugger } from '@/components/devtools/QueryResultDebugger';
import { dsDuckdbMemory } from '@/server/config/ds.duckdb-memory.config';

type Row = { id: number; name: 'test'; createdAt: Date };

const getSqlQuery = (): SqlTag<Row[]> => {
  const params = {
    min: 10,
    max: 99,
    name: 'test',
    createdAt: '2025-01-22T23:54:41.114Z',
  };

  const query = sql<Row>`

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
  return query;
};

export const DuckdbDemoPage: FC = async () => {
  const query = getSqlQuery();
  const result = await dsDuckdbMemory.query(query);
  return (
    <div>
      <QueryResultDebugger result={result} />
    </div>
  );
};

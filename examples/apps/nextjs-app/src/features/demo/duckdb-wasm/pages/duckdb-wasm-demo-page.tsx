'use client';

import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { FC } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { getDuckDB } from '@/lib/duckdb/duckdb-wasm-init';

export const DuckdbWasmDemoPage: FC = () => {
  const connectionRef = useRef<AsyncDuckDBConnection | null>(null);

  useLayoutEffect(() => {
    const init = async () => {
      const duckdb = await getDuckDB();
      connectionRef.current = await duckdb.connect();
      console.log('DuckDB connection established');

      console.log(
        await connectionRef.current.query(`
        WITH products(productId, createdAt) AS MATERIALIZED (
        FROM RANGE(1,1000) SELECT
          range::INT,
          TIMESTAMPTZ '2025-01-01 12:30:00.123456789+01:00'
        )
        SELECT 
           productId,
           'cool' as name,
           createdAt
        FROM products`)
      );
    };
    void init();
  }, []);

  return <div>Cool</div>;
};

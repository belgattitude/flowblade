'use client';

import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { FC } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { getDuckDB } from '@/lib/duckdb/duckdb-wasm-init';

export const DuckdbWasmTestPanel: FC = () => {
  const connectionRef = useRef<AsyncDuckDBConnection | null>(null);

  // just a basic test
  // @todo move this a hook
  useLayoutEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const duckdb = await getDuckDB();
        if (!isMounted) return;
        connectionRef.current = await duckdb.connect();
        if (!isMounted) {
          connectionRef.current.close().catch(console.error);
          return;
        }
        console.log('DuckDB connection established');
        console.log(
          'Duckdb query result...',
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
      } catch (error) {
        console.error('Failed to initialize DuckDB:', error);
      }
    };
    void init();
    return () => {
      isMounted = false;
      // Clean up the connection when component unmounts
      if (connectionRef.current) {
        connectionRef.current.close().catch(console.error);
        connectionRef.current = null;
      }
    };
  }, []);

  return <div>Cool</div>;
};

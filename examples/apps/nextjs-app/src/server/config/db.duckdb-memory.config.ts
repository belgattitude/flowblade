import os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

const createDuckDBMemoryDb = async (
  maxThreads = 4
): Promise<DuckDBConnection> => {
  const availableThreads = os.availableParallelism();
  const maxParallelism = Math.min(maxThreads, availableThreads - 1);
  const threads = availableThreads > 1 ? maxParallelism : undefined;

  const instance = await DuckDBInstance.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    ...(threads ? { threads: threads.toString(10) } : {}),
  });
  return await instance.connect();
};

// @see instrumentation.ts
export const initializeDuckDbMemoryConn =
  async (): Promise<DuckDBConnection> => {
    return createDuckDBMemoryDb();
  };

export const dbDuckDbMemoryConn =
  process.env.NODE_ENV === 'production'
    ? await createDuckDBMemoryDb()
    : (
        globalThis as unknown as {
          dbDuckDbMemoryConn: DuckDBConnection;
        }
      ).dbDuckDbMemoryConn;

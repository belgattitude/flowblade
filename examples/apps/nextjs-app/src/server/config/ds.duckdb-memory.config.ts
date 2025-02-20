import os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { DuckdbDatasource } from '@flowblade/source-duckdb';

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

const duckDbMemoryConnection = await createDuckDBMemoryDb();

export const dsDuckdbMemory = new DuckdbDatasource({
  connection: duckDbMemoryConnection,
});

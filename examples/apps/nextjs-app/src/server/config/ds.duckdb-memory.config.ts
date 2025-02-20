import os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { DuckdbDatasource } from '@flowblade/source-duckdb';

const createDuckDBMemoryDb = async (): Promise<DuckDBConnection> => {
  const instance = await DuckDBInstance.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    threads: `${Math.max(os.availableParallelism() - 1, 4)}`,
  });
  return await instance.connect();
};

const duckDbMemoryConnection = await createDuckDBMemoryDb();

export const dsDuckdbMemory = new DuckdbDatasource({
  connection: duckDbMemoryConnection,
});

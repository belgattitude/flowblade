import * as os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

export const createDuckDBE2EMemoryDb = async (): Promise<DuckDBConnection> => {
  const instance = await DuckDBInstance.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    threads: `${Math.min(os.availableParallelism() - 1, 4)}`,
  });
  return await instance.connect();
};

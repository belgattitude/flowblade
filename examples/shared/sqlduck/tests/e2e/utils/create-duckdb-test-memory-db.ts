import * as os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

export const createDuckdbTestMemoryDb = async (): Promise<DuckDBConnection> => {
  const instance = await DuckDBInstance.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    threads: `${Math.max(1, Math.min(os.availableParallelism() - 1, 4))}`,
  });
  return await instance.connect();
};

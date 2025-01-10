import * as os from 'node:os';

import { Database } from 'duckdb-async';

export const createDuckDBE2EMemoryDb = async (): Promise<Database> => {
  return await Database.create(':memory:', {
    access_mode: 'READ_WRITE',
    max_memory: '64MB',
    threads: `${Math.min(os.cpus().length - 1, 4)}`,
  });
};

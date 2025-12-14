import * as os from 'node:os';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

export const createDuckdbTestMemoryDb = async (options?: {
  access_mode?: 'READ_WRITE';
  max_memory?: `${number}M`;
  threads?: number;
}): Promise<DuckDBConnection> => {
  const {
    access_mode = 'READ_WRITE',
    max_memory = '64M',
    threads = Math.max(1, Math.min(os.availableParallelism() - 1, 4)),
  } = options ?? {};
  const instance = await DuckDBInstance.create(undefined, {
    access_mode,
    max_memory,
    threads: String(threads),
    temp_directory: '.tmp',
  });
  return await instance.connect();
};

import * as os from 'node:os';
import path from 'node:path';

import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

export const createDuckdbTestMemoryDb = async (options?: {
  access_mode?: 'READ_WRITE';
  max_memory?: `${number}M`;
  threads?: number;
  /**
   * @default to ${os.tmpdir()}/duckdb-test
   */
  temp_directory?: string;
  extension_directory?: string;
}): Promise<DuckDBConnection> => {
  const {
    access_mode = 'READ_WRITE',
    max_memory = '256M',
    threads = Math.max(1, Math.min(os.availableParallelism() - 1, 4)),
    temp_directory = path.join(os.tmpdir(), 'duckdb-temp'),
    extension_directory = path.join(os.tmpdir(), 'duckdb-temp/extensions'),
  } = options ?? {};

  const instance = await DuckDBInstance.create(undefined, {
    access_mode,
    max_memory,
    threads: String(threads),
    temp_directory,
    ...(extension_directory
      ? { extension_directory: extension_directory }
      : {}),
  });
  return await instance.connect();
};

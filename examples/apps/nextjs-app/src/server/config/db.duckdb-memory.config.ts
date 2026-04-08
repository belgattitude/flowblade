import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

import { createAndEnsureWritableDirectory } from '@/server/utils/filesystem.utils.ts';

import { serverEnv } from '../../env/server.env.mjs';
/**
 * Initial configuration of duckdb memory instance
 * @see https://github.com/duckdb/duckdb-node-neo/blob/main/api/pkgs/@duckdb/node-api/README.md#create-instance
 * @see https://duckdb.org/docs/current/configuration/overview
 */
type DuckConfiguration = {
  /**
   *
   * @see https://duckdb.org/docs/current/configuration/pragmas#threads
   */
  threads?: string;
  /**
   * @see https://duckdb.org/docs/current/configuration/pragmas#memory-limit
   */
  memoryLimit?: string;

  tempDirectory?: string;
  extensionDirectory?: string;
};

/**
 * @throws Error if tempDirectory or extensionDirectory are not writable or doesn't exist
 */
export const createDuckDbMemoryConnection = async (
  config?: DuckConfiguration
): Promise<DuckDBConnection> => {
  const {
    threads = serverEnv.DUCKDB_THREADS,
    memoryLimit = serverEnv.DUCKDB_MEMORY_LIMIT,
    tempDirectory = serverEnv.DUCKDB_TEMP_DIRECTORY,
    extensionDirectory = serverEnv.DUCKDB_EXTENSION_DIRECTORY,
  } = config ?? {};

  createAndEnsureWritableDirectory('tempDirectory', tempDirectory);
  createAndEnsureWritableDirectory('extensionDirectory', extensionDirectory);

  const instance = await DuckDBInstance.create(':memory:', {
    ...(memoryLimit ? { memory_limit: memoryLimit } : {}),
    ...(threads ? { threads } : {}),
    ...(tempDirectory ? { temp_directory: tempDirectory } : {}),
    ...(extensionDirectory ? { extension_directory: extensionDirectory } : {}),
  });
  return await instance.connect();
};

// @see instrumentation.ts
export const dbDuckDbMemoryConn =
  process.env.NODE_ENV === 'production'
    ? await createDuckDbMemoryConnection()
    : (
        globalThis as unknown as {
          dbDuckDbMemoryConn: DuckDBConnection;
        }
      ).dbDuckDbMemoryConn;

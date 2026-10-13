import * as os from "node:os";
import path from "node:path";

import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";

export type DuckdbTestMemoryDbOptions = {
  access_mode?: "READ_WRITE";
  max_memory?: `${number}M`;
  threads?: number;
  /**
   * @default to ${os.tmpdir()}/duckdb-test
   */
  temp_directory?: string;
  extension_directory?: string;
};

export type DuckdbTestMemoryDb = {
  instance: DuckDBInstance;
  conn: DuckDBConnection;
  /**
   * Close both the connection and the underlying instance
   */
  close: () => void;
};

export const openDuckdbTestMemoryDb = async (
  options?: DuckdbTestMemoryDbOptions
): Promise<DuckdbTestMemoryDb> => {
  const {
    access_mode = "READ_WRITE",
    max_memory = "256M",
    threads = Math.max(1, Math.min(os.availableParallelism() - 1, 4)),
    temp_directory = path.join(os.tmpdir(), "duckdb-temp"),
    extension_directory = path.join(os.tmpdir(), "duckdb-temp/extensions"),
  } = options ?? {};

  const instance = await DuckDBInstance.create(undefined, {
    access_mode,
    max_memory,
    threads: String(threads),
    temp_directory,
    extension_directory,
  });
  const conn = await instance.connect();
  return {
    instance,
    conn,
    close: () => {
      conn.closeSync();
      instance.closeSync();
    },
  };
};

/**
 * Return only the connection, the caller won't be able to close the instance.
 * Prefer `openDuckdbTestMemoryDb` or the `createDuckTest` fixture.
 */
export const createDuckdbTestMemoryDb = async (
  options?: DuckdbTestMemoryDbOptions
): Promise<DuckDBConnection> => {
  const { conn } = await openDuckdbTestMemoryDb(options);
  return conn;
};

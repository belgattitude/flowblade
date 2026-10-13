import { test as baseTest } from "vitest";

import { openDuckdbTestMemoryDb } from "./create-duckdb-test-memory-db.ts";
import type { DuckdbTestMemoryDbOptions } from "./create-duckdb-test-memory-db.ts";

const createConn = async (
  options: DuckdbTestMemoryDbOptions | undefined,
  onCleanup: (fn: () => void) => void
) => {
  const db = await openDuckdbTestMemoryDb(options);
  onCleanup(() => db.close());
  return db.conn;
};

/**
 * Create a vitest `test` providing a duckdb memory connection as `conn` fixture,
 * shared by all tests of the file. The connection and its instance are closed
 * once the file is done.
 *
 * @example
 * ```ts
 * const it = createDuckTest({ max_memory: "128M" });
 * it("query", async ({ conn }) => {
 *   await conn.run("SELECT 1");
 * });
 * // suite hooks can access the connection too
 * it.beforeAll(async ({ conn }) => {});
 * ```
 */
export const createDuckTest = (options?: DuckdbTestMemoryDbOptions) =>
  // oxlint-disable-next-line no-empty-pattern -- vitest fixtures must destructure their first argument
  baseTest.extend("conn", { scope: "file" }, ({}, { onCleanup }) =>
    createConn(options, onCleanup)
  );

/**
 * Same as `createDuckTest`, but each test gets a fresh connection.
 */
export const createDuckTestIsolated = (options?: DuckdbTestMemoryDbOptions) =>
  // oxlint-disable-next-line no-empty-pattern -- vitest fixtures must destructure their first argument
  baseTest.extend("conn", { scope: "test" }, ({}, { onCleanup }) =>
    createConn(options, onCleanup)
  );

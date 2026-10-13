import * as os from "node:os";

import { DuckDBInstance } from "@duckdb/node-api";
import { test as baseTest } from "vitest";

import { DuckdbDatasource } from "../../src/index.ts";

/**
 * Vitest `test` providing a `ds` fixture: a DuckdbDatasource on a fresh
 * in-memory database, closed (connection and instance) after each test.
 */
export const duckTest = baseTest.extend(
  "ds",
  // oxlint-disable-next-line no-empty-pattern -- vitest fixtures must destructure their first argument
  async ({}, { onCleanup }) => {
    const instance = await DuckDBInstance.create(":memory:", {
      access_mode: "READ_WRITE",
      max_memory: "64MB",
      threads: `${Math.max(1, Math.min(os.availableParallelism() - 1, 4))}`,
    });
    const connection = await instance.connect();
    onCleanup(() => {
      connection.closeSync();
      instance.closeSync();
    });
    return new DuckdbDatasource({ connection });
  }
);

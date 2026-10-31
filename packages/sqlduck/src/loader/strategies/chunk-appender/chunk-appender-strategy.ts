import { DuckDBDataChunk } from "@duckdb/node-api";

import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import { assertChunkSize } from "../../utils/assert-chunk-size.ts";
import { assertFrequency } from "../../utils/assert-frequency.ts";

export type ChunkAppenderStrategyOptions = {
  /**
   * Number of rows per DuckDB data chunk, between 1 and 2048.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Call `appender.flushSync()` every N chunks (1 to 100_000).
   *
   * Each flush has a fixed cost, frequent flushes slow down inserts
   * (~30% slower with 10 than 100 on a file database).
   * @default 100
   */
  flushEvery?: number;
};

/**
 * Load rows with the DuckDB appender, one data chunk at a time.
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new ChunkAppenderStrategy({ chunkSize: 2048, flushEvery: 100 }),
 * });
 * ```
 */
export class ChunkAppenderStrategy implements LoadStrategy {
  readonly name = "chunkAppender";
  readonly chunkSize: number;
  readonly #flushEvery: number;

  constructor(options?: ChunkAppenderStrategyOptions) {
    const { chunkSize = 2048, flushEvery = 100 } = options ?? {};
    assertChunkSize(chunkSize, "chunkSize");
    assertFrequency(flushEvery, "flushEvery");
    this.chunkSize = chunkSize;
    this.#flushEvery = flushEvery;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnTypes } = context;
    const appender = await conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );
    const flushEvery = this.#flushEvery;
    let chunkCount = 0;
    return {
      appendChunk: (columns) => {
        const chunk = DuckDBDataChunk.create(columnTypes);
        chunk.setColumns(columns);
        appender.appendDataChunk(chunk);
        chunkCount += 1;
        if (chunkCount % flushEvery === 0) {
          appender.flushSync();
        }
      },
      complete: () => {
        appender.flushSync();
        appender.closeSync();
      },
      abort: () => {
        appender.closeSync();
      },
    };
  };
}

import { DuckDBDataChunk } from "@duckdb/node-api";

import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import {
  assertPositiveInteger,
  MAX_CHUNK_SIZE,
} from "../../utils/assert-positive-integer.ts";
import { crossedEveryRows } from "../../utils/crossed-every-rows.ts";

export type ChunkAppenderStrategyOptions = {
  /**
   * Number of rows per DuckDB data chunk, between 1 and 2048.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Flush the appender (`appender.flushSync()`) each time N more rows are
   * appended, at the end of the chunk crossing the threshold. Flushing
   * makes the rows visible in the table, it is not a checkpoint. Rows flushed
   * in a transaction are not visible to other connections until commit.
   *
   * Each flush has a fixed cost, frequent flushes slow down inserts
   * (~30% slower every 20_480 rows than every 204_800 on a file database).
   * @default 204_800 (100 chunks of 2048 rows)
   */
  flushEveryRows?: number;
};

/**
 * Load rows with the DuckDB appender, one data chunk at a time.
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new ChunkAppenderStrategy({ chunkSize: 2048, flushEveryRows: 204_800 }),
 * });
 * ```
 */
export class ChunkAppenderStrategy implements LoadStrategy {
  readonly name = "chunkAppender";
  readonly chunkSize: number;
  readonly #flushEveryRows: number;

  constructor(options?: ChunkAppenderStrategyOptions) {
    const { chunkSize = MAX_CHUNK_SIZE, flushEveryRows = 204_800 } =
      options ?? {};
    assertPositiveInteger(chunkSize, "chunkSize", MAX_CHUNK_SIZE);
    assertPositiveInteger(flushEveryRows, "flushEveryRows");
    this.chunkSize = chunkSize;
    this.#flushEveryRows = flushEveryRows;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnTypes } = context;
    const appender = await conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );
    const flushEveryRows = this.#flushEveryRows;
    let totalRows = 0;
    return {
      appendChunk: (columns) => {
        const chunk = DuckDBDataChunk.create(columnTypes);
        chunk.setColumns(columns);
        appender.appendDataChunk(chunk);
        const previousRows = totalRows;
        totalRows += columns[0]?.length ?? 0;
        if (crossedEveryRows(flushEveryRows, previousRows, totalRows)) {
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

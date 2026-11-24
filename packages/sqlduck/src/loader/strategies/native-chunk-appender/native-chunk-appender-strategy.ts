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
import {
  createDataChunkWriter,
  getNativeWriterColumns,
} from "./create-data-chunk-writer.ts";

export type NativeChunkAppenderStrategyOptions = {
  /**
   * Number of rows per DuckDB data chunk, between 1 and 2048.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Flush the appender (`appender.flushSync()`) each time N more rows are
   * appended, at the end of the chunk crossing the threshold. See
   * `ChunkAppenderStrategy`.
   * @default 204_800 (100 chunks of 2048 rows)
   */
  flushEveryRows?: number;
};

/**
 * **Experimental**: same as `ChunkAppenderStrategy`, but the data chunks are
 * written directly in the native DuckDB vectors (typed arrays and bulk copies)
 * instead of node-api per item vectors, which is about 16-24% faster.
 *
 * Columns of a type that isn't handled (ie: HUGEINT, BIGNUM, DECIMAL widths
 * other than 10-18) are written by node-api, and so is every column when the
 * native bindings used by `@duckdb/node-api` can't be loaded (or on big endian
 * platforms). The columns written natively are logged at the debug level.
 *
 * It relies on the `@duckdb/node-bindings` functions node-api itself uses, which
 * aren't a public API: the behavior and the error messages of invalid values
 * (ie: `number out of int32 range`) may differ from `ChunkAppenderStrategy`
 * and may change between `@duckdb/node-api` versions.
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new NativeChunkAppenderStrategy({ chunkSize: 2048 }),
 * });
 * ```
 */
export class NativeChunkAppenderStrategy implements LoadStrategy {
  readonly name = "nativeChunkAppender";
  readonly chunkSize: number;
  readonly #flushEveryRows: number;

  constructor(options?: NativeChunkAppenderStrategyOptions) {
    const { chunkSize = MAX_CHUNK_SIZE, flushEveryRows = 204_800 } =
      options ?? {};
    assertPositiveInteger(chunkSize, "chunkSize", MAX_CHUNK_SIZE);
    assertPositiveInteger(flushEveryRows, "flushEveryRows");
    this.chunkSize = chunkSize;
    this.#flushEveryRows = flushEveryRows;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes, logger } = context;
    const appender = await conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );
    const writeChunk = createDataChunkWriter(columnTypes);
    const nativeColumns = getNativeWriterColumns(columnTypes);
    logger.debug(
      "Native chunk writer for table '{table}': {nativeCount}/{total} columns written natively, node-api for: {fallback}",
      {
        table: table.getFullName(),
        nativeCount: nativeColumns.filter(Boolean).length,
        total: columnTypes.length,
        fallback: columnNames
          .filter((_, i) => nativeColumns[i] !== true)
          .join(", "),
      }
    );
    const flushEveryRows = this.#flushEveryRows;
    let totalRows = 0;
    return {
      appendChunk: (columns) => {
        const chunk = DuckDBDataChunk.create(columnTypes);
        writeChunk(chunk, columns);
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

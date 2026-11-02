import { getErrorMessage } from "../../../utils/get-error-message.ts";
import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import {
  assertPositiveInteger,
  MAX_CHUNK_SIZE,
} from "../../utils/assert-positive-integer.ts";

export type RowAppenderStrategyOptions = {
  /**
   * Number of converted rows handed to the strategy at once, between 1
   * and 2048. Rows are still appended one by one.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Flush the appender (`appender.flushSync()`) after every N rows.
   * Flushing makes the rows visible in the table, it is not a checkpoint.
   * @default 204_800
   */
  flushEveryRows?: number;
};

/**
 * Load rows with the DuckDB appender, one value at a time.
 *
 * Slower than {@link ChunkAppenderStrategy}, but a failing value is reported
 * with its row index and column name, which helps finding bad data.
 *
 * When a value fails, DuckDB can't drop the partially appended row: all the
 * rows appended since the last flush are discarded. Use a small
 * `flushEveryRows` to keep more rows (`1` keeps every row before the
 * failing one).
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new RowAppenderStrategy(),
 * });
 * ```
 */
export class RowAppenderStrategy implements LoadStrategy {
  readonly name = "rowAppender";
  readonly chunkSize: number;
  readonly #flushEveryRows: number;

  constructor(options?: RowAppenderStrategyOptions) {
    const { chunkSize = MAX_CHUNK_SIZE, flushEveryRows = 204_800 } =
      options ?? {};
    assertPositiveInteger(chunkSize, "chunkSize", MAX_CHUNK_SIZE);
    assertPositiveInteger(flushEveryRows, "flushEveryRows");
    this.chunkSize = chunkSize;
    this.#flushEveryRows = flushEveryRows;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes } = context;
    const appender = await conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );
    const flushEveryRows = this.#flushEveryRows;
    // Index of the row in the whole load, 0-based
    let rowIndex = 0;
    return {
      appendChunk: (columns) => {
        const rowCount = columns[0]?.length ?? 0;
        for (let r = 0; r < rowCount; r++) {
          for (let c = 0; c < columns.length; c++) {
            // eslint-disable-next-line typescript/no-non-null-assertion
            const value = columns[c]![r]!;
            try {
              appender.appendValue(value, columnTypes[c]);
            } catch (error) {
              throw new Error(
                `Row ${rowIndex}, column '${columnNames[c]}' - ${getErrorMessage(error)}`,
                { cause: error }
              );
            }
          }
          appender.endRow();
          rowIndex += 1;
          if (rowIndex % flushEveryRows === 0) {
            appender.flushSync();
          }
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

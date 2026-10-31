import { getErrorMessage } from "../../../utils/get-error-message.ts";
import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import { assertChunkSize } from "../../utils/assert-chunk-size.ts";
import { assertFrequency } from "../../utils/assert-frequency.ts";

export type RowAppenderStrategyOptions = {
  /**
   * Number of converted rows handed to the strategy at once, between 1
   * and 2048. Rows are still appended one by one.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Call `appender.flushSync()` every N chunks (1 to 100_000).
   * @default 100
   */
  flushEvery?: number;
};

/**
 * Load rows with the DuckDB appender, one value at a time.
 *
 * Slower than {@link ChunkAppenderStrategy}, but a failing value is reported
 * with its row index and column name, which helps finding bad data.
 *
 * When a value fails, DuckDB can't drop the partially appended row: all the
 * rows appended since the last flush are discarded. Use a small `flushEvery`
 * to keep more rows.
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
  readonly #flushEvery: number;

  constructor(options?: RowAppenderStrategyOptions) {
    const { chunkSize = 2048, flushEvery = 100 } = options ?? {};
    assertChunkSize(chunkSize, "chunkSize");
    assertFrequency(flushEvery, "flushEvery");
    this.chunkSize = chunkSize;
    this.#flushEvery = flushEvery;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes } = context;
    const appender = await conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );
    const flushEvery = this.#flushEvery;
    let chunkCount = 0;
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
        }
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

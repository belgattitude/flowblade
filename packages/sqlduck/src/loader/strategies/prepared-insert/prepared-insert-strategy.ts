import type { DuckDBPreparedStatement } from "@duckdb/node-api";

import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import {
  assertPositiveInteger,
  MAX_CHUNK_SIZE,
} from "../../utils/assert-positive-integer.ts";

/**
 * What to do when a row conflicts with a primary key or unique constraint.
 * - `error`: fail the load (plain `INSERT`)
 * - `ignore`: keep the existing row (`INSERT OR IGNORE`)
 * - `replace`: overwrite the existing row (`INSERT OR REPLACE`)
 */
export type PreparedInsertOnConflict = "error" | "ignore" | "replace";

export type PreparedInsertStrategyOptions = {
  /**
   * Number of rows inserted by each `INSERT` statement, between 1 and 2048.
   * @default 256
   */
  chunkSize?: number;
  /**
   * @default 'error'
   */
  onConflict?: PreparedInsertOnConflict;
};

const insertVerbs = {
  error: "INSERT INTO",
  ignore: "INSERT OR IGNORE INTO",
  replace: "INSERT OR REPLACE INTO",
} as const satisfies Record<PreparedInsertOnConflict, string>;

const quoteIdentifier = (name: string) => `"${name.replaceAll('"', '""')}"`;

/**
 * Load rows with prepared multi-row `INSERT ... VALUES` statements.
 *
 * Slower than {@link ChunkAppenderStrategy}, but supports conflicts on
 * primary keys (`onConflict: 'ignore' | 'replace'`), which the appender
 * can't do.
 *
 * @example
 * ```typescript
 * // Upsert rows into an existing table
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new PreparedInsertStrategy({ onConflict: 'replace' }),
 * });
 * await loader.load({ table, schema, rows, mode: 'createIfNotExists' });
 * ```
 */
export class PreparedInsertStrategy implements LoadStrategy {
  readonly name = "preparedInsert";
  readonly chunkSize: number;
  readonly #onConflict: PreparedInsertOnConflict;

  constructor(options?: PreparedInsertStrategyOptions) {
    const { chunkSize = 256, onConflict = "error" } = options ?? {};
    assertPositiveInteger(chunkSize, "chunkSize", MAX_CHUNK_SIZE);
    this.chunkSize = chunkSize;
    this.#onConflict = onConflict;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes } = context;
    const { chunkSize } = this;
    const columnCount = columnNames.length;
    const insertPrefix = `${insertVerbs[this.#onConflict]} ${table.getFullName()} (${columnNames.map(quoteIdentifier).join(", ")}) VALUES `;
    const rowPlaceholders = `(${Array.from({ length: columnCount }, () => "?").join(", ")})`;

    const prepare = (rowCount: number) =>
      conn.prepare(
        insertPrefix +
          Array.from({ length: rowCount }, () => rowPlaceholders).join(", ")
      );
    // Only the full chunk statement is reused: smaller chunks (the last one,
    // or yielded early for progress) can have any size, caching them would
    // keep up to chunkSize statements alive.
    let fullChunkStatement: DuckDBPreparedStatement | undefined;
    const destroyFullChunkStatement = () => {
      fullChunkStatement?.destroySync();
      fullChunkStatement = undefined;
    };

    return {
      appendChunk: async (columns) => {
        const rowCount = columns[0]?.length ?? 0;
        if (rowCount === 0) {
          return;
        }
        const isFullChunk = rowCount === chunkSize;
        if (isFullChunk) {
          fullChunkStatement ??= await prepare(rowCount);
        }
        const statement = isFullChunk
          ? // eslint-disable-next-line typescript/no-non-null-assertion
            fullChunkStatement!
          : await prepare(rowCount);
        try {
          for (let c = 0; c < columnCount; c++) {
            // eslint-disable-next-line typescript/no-non-null-assertion
            const column = columns[c]!;
            const type = columnTypes[c];
            for (let r = 0; r < rowCount; r++) {
              // Parameters are 1-based, row-major
              // eslint-disable-next-line typescript/no-non-null-assertion
              statement.bindValue(r * columnCount + c + 1, column[r]!, type);
            }
          }
          await statement.run();
        } finally {
          if (!isFullChunk) {
            statement.destroySync();
          }
        }
      },
      complete: destroyFullChunkStatement,
      abort: destroyFullChunkStatement,
    };
  };
}

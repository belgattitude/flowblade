import type { DuckDBPreparedStatement } from "@duckdb/node-api";

import type {
  LoadStrategy,
  LoadStrategyContext,
  LoadStrategySession,
} from "../../types.ts";
import { assertChunkSize } from "../../utils/assert-chunk-size.ts";

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
  rowsPerInsert?: number;
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
    const { rowsPerInsert = 256, onConflict = "error" } = options ?? {};
    assertChunkSize(rowsPerInsert, "rowsPerInsert");
    this.chunkSize = rowsPerInsert;
    this.#onConflict = onConflict;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes } = context;
    const columnCount = columnNames.length;
    const insertPrefix = `${insertVerbs[this.#onConflict]} ${table.getFullName()} (${columnNames.map(quoteIdentifier).join(", ")}) VALUES `;
    const rowPlaceholders = `(${Array.from({ length: columnCount }, () => "?").join(", ")})`;

    // One statement per row count: the full chunk size, and the last chunk
    const statements = new Map<number, DuckDBPreparedStatement>();
    const getStatement = async (rowCount: number) => {
      let statement = statements.get(rowCount);
      if (statement === undefined) {
        statement = await conn.prepare(
          insertPrefix +
            Array.from({ length: rowCount }, () => rowPlaceholders).join(", ")
        );
        statements.set(rowCount, statement);
      }
      return statement;
    };
    const destroyStatements = () => {
      for (const statement of statements.values()) {
        statement.destroySync();
      }
      statements.clear();
    };

    return {
      appendChunk: async (columns) => {
        const rowCount = columns[0]?.length ?? 0;
        if (rowCount === 0) {
          return;
        }
        const statement = await getStatement(rowCount);
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
      },
      complete: destroyStatements,
      abort: destroyStatements,
    };
  };
}

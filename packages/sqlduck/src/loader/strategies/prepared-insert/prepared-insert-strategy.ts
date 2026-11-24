import { DuckDBListType, listValue } from "@duckdb/node-api";
import type { DuckDBPreparedStatement } from "@duckdb/node-api";

import { quoteIdentifier } from "../../../utils/quote-value.ts";
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
   * @default 2048
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

/**
 * Load rows with a prepared `INSERT ... SELECT unnest(...)` statement: each
 * column of a chunk is bound as a single list parameter.
 *
 * Slower than {@link ChunkAppenderStrategy}, but supports conflicts on
 * primary keys (`onConflict: 'ignore' | 'replace'`), which the appender
 * can't do.
 *
 * A chunk is inserted by one statement, if it fails the rows of the previous
 * chunks are kept.
 *
 * Rows of the same chunk sharing a key: DuckDB keeps the first one with both
 * `'ignore'` and `'replace'`, `'replace'` only overwrites rows inserted before
 * the chunk. Deduplicate the rows beforehand when the last one must win.
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
    const { chunkSize = MAX_CHUNK_SIZE, onConflict = "error" } = options ?? {};
    assertPositiveInteger(chunkSize, "chunkSize", MAX_CHUNK_SIZE);
    this.chunkSize = chunkSize;
    this.#onConflict = onConflict;
  }

  open = async (context: LoadStrategyContext): Promise<LoadStrategySession> => {
    const { conn, table, columnNames, columnTypes } = context;
    const tableName = [table.databaseName, table.schemaName, table.tableName]
      .filter((part) => part !== undefined)
      .map(quoteIdentifier)
      .join(".");
    // One list parameter per column, cast to the column type. Without the
    // cast DuckDB can't type the parameter when preparing, which is ~25%
    // slower. `toString()` renders valid SQL types (enum members are quoted).
    const unnests = columnTypes
      .map((type) => `unnest(?::${type.toString()}[])`)
      .join(", ");
    const sql = `${insertVerbs[this.#onConflict]} ${tableName} (${columnNames.map(quoteIdentifier).join(", ")}) SELECT ${unnests}`;
    const listTypes = columnTypes.map((type) => new DuckDBListType(type));

    // Prepared with the first chunk (not on open), the table must exist then
    let statement: DuckDBPreparedStatement | undefined;
    const destroyStatement = () => {
      statement?.destroySync();
      statement = undefined;
    };

    return {
      appendChunk: async (columns) => {
        if ((columns[0]?.length ?? 0) === 0) {
          return;
        }
        statement ??= await conn.prepare(sql);
        // Parameters are 1-based
        for (const [c, column] of columns.entries()) {
          statement.bindValue(c + 1, listValue(column), listTypes[c]);
        }
        await statement.run();
      },
      complete: destroyStatement,
      abort: destroyStatement,
    };
  };
}

import type {
  DuckDBConnection,
  DuckDBType,
  DuckDBValue,
} from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";

import type { Table } from "../objects/table.ts";
import type {
  InferZodRelaxedDataSchema,
  TableSchemaZod,
} from "../validation/zod/index.ts";
import type { OnLoadProgressCb } from "./progress/progress-collector.ts";

/**
 * Rows to load: any sync or async iterable (arrays, generators, streams...).
 */
export type RowStream<T> = Iterable<T> | AsyncIterable<T>;

/**
 * What happens to the target table before the rows are loaded.
 *
 * - `create`: `CREATE TABLE`, fails when the table exists
 * - `createOrReplace`: `CREATE OR REPLACE TABLE`
 * - `createIfNotExists`: `CREATE TABLE IF NOT EXISTS`, an existing table
 *   must have the schema columns
 * - `append`: no DDL, the table must exist with the schema columns
 */
export type LoadMode =
  | "create"
  | "createOrReplace"
  | "createIfNotExists"
  | "append";

export type LoadStrategyContext = {
  conn: DuckDBConnection;
  table: Table;
  /**
   * Names of the table columns, in column order.
   */
  columnNames: string[];
  /**
   * DuckDB types of the table columns, in column order.
   */
  columnTypes: DuckDBType[];
  logger: Logger;
};

/**
 * A strategy session writes the converted chunks of a single load.
 *
 * Either `complete` is called once all chunks are appended, or `abort` is
 * called after a failure (including a failing `complete`).
 */
export interface LoadStrategySession {
  /**
   * Append one chunk of columns (column-major, at most `chunkSize` rows).
   */
  appendChunk: (columns: DuckDBValue[][]) => void | Promise<void>;
  /**
   * Make all appended data visible and release resources.
   */
  complete: () => void | Promise<void>;
  /**
   * Release resources after a failure, may throw (errors are logged).
   */
  abort: () => void | Promise<void>;
}

/**
 * How the converted rows are written into the table.
 */
export interface LoadStrategy {
  readonly name: string;
  /**
   * Maximum number of rows per chunk handed to `appendChunk`, a positive
   * integer.
   */
  readonly chunkSize: number;
  open: (context: LoadStrategyContext) => Promise<LoadStrategySession>;
}

export type LoadCheckpointOptions = {
  /**
   * Checkpoint the database each time N more rows are loaded, at the end
   * of the chunk crossing the threshold.
   */
  everyRows?: number;
  /**
   * Checkpoint the database once all rows are loaded.
   * @default true when the table database is stored in a file, false for
   * in-memory databases (the database is `table.databaseName` or the
   * current database)
   */
  onComplete?: boolean;
};

export type LoadProgressOptions = {
  /**
   * Called during the load, and once at the end when the last rows were
   * not reported yet. Awaited when it returns a promise (backpressure), a
   * rejection fails the load.
   */
  onProgress: OnLoadProgressCb;
} & (
  | {
      /**
       * Call `onProgress` at the end of the first chunk loaded after N
       * milliseconds since the previous call (or the start of the load),
       * `0` calls it after every chunk.
       * @default 1000
       */
      intervalMs?: number;
      everyRows?: never;
    }
  | {
      /**
       * Call `onProgress` each time N more rows are loaded, at the end of
       * the chunk crossing the threshold. Replaces `intervalMs`.
       */
      everyRows: number;
      intervalMs?: never;
    }
);

export type LoadParams<TSchema extends TableSchemaZod> = {
  /**
   * The target table.
   */
  table: Table;
  /**
   * Zod schema of the table, used to generate the `CREATE TABLE` DDL and
   * to convert row values to DuckDB types.
   */
  schema: TSchema;
  /**
   * Rows to load: any sync or async iterable (arrays, generators...).
   */
  rows: RowStream<InferZodRelaxedDataSchema<TSchema>>;
  /**
   * @default 'create'
   */
  mode?: LoadMode;
  checkpoint?: LoadCheckpointOptions;
  progress?: LoadProgressOptions;
  /**
   * Aborts the load, `load` then rejects with `signal.reason` and closes
   * `rows`. The table is still created and the chunks loaded before the
   * abort are kept, but no checkpoint happens.
   */
  signal?: AbortSignal;
};

export type LoadResult = {
  /**
   * Total time taken to load the data in milliseconds.
   */
  timeMs: number;
  /**
   * Total number of rows loaded.
   */
  totalRows: number;
  /**
   * The DDL statement used to create the table, `undefined` in `append`
   * mode.
   */
  createTableDDL: string | undefined;
  /**
   * Name of the strategy used.
   */
  strategy: string;
  mode: LoadMode;
};

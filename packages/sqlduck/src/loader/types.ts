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

export type RowStream<T> =
  | AsyncIterableIterator<T>
  | AsyncGenerator<T>
  | Generator<T>;

/**
 * What happens to the target table before the rows are loaded.
 */
export type LoadMode = "create" | "createOrReplace" | "createIfNotExists";

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
   * Number of rows per chunk handed to `appendChunk`.
   */
  readonly chunkSize: number;
  open: (context: LoadStrategyContext) => Promise<LoadStrategySession>;
}

export type LoadCheckpointOptions = {
  /**
   * Checkpoint the database every N chunks (1 to 100_000).
   * Requires `table.databaseName`.
   */
  every?: number;
  /**
   * Checkpoint the database once all rows are loaded.
   * Setting it to `true` requires `table.databaseName`.
   * @default true when `table.databaseName` is set, false otherwise
   */
  onComplete?: boolean;
};

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
   * An iterable (async or sync) or generator that yields the rows to load.
   */
  rows: RowStream<InferZodRelaxedDataSchema<TSchema>>;
  /**
   * @default 'create'
   */
  mode?: LoadMode;
  checkpoint?: LoadCheckpointOptions;
  /**
   * Overrides DuckDB's `preserve_insertion_order` session setting during
   * the load, the original value is restored afterwards.
   * If omitted, the session setting is left untouched.
   * @see {@link https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#preserving-insertion-order}
   */
  preserveInsertionOrder?: boolean;
  /**
   * Called after chunks are appended, awaited when it returns a promise.
   */
  onProgress?: OnLoadProgressCb;
  /**
   * Call `onProgress` every N chunks (1 to 100_000).
   * @default 1
   */
  progressEvery?: number;
  /**
   * Aborts the load, `load` then rejects with `signal.reason` and closes
   * `rows`. The table is still created and the chunks appended before the
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
   * The DDL statement used to create the table.
   */
  createTableDDL: string;
  /**
   * Name of the strategy used.
   */
  strategy: string;
  mode: LoadMode;
};

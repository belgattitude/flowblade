import type { DuckDBConnection } from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";
import type { ZodObject } from "zod";

import { DuckTableLoader } from "./loader/duck-table-loader.ts";
import type { OnChunkAppendedCb } from "./loader/progress/progress-collector.ts";
import { ChunkAppenderStrategy } from "./loader/strategies/chunk-appender/chunk-appender-strategy.ts";
import type { LoadMode, RowStream } from "./loader/types.ts";
import { assertFrequency } from "./loader/utils/assert-frequency.ts";
import { sqlduckDefaultLogtapeLogger } from "./logger/sqlduck-default-logtape-logger.ts";
import type { Table } from "./objects/table.ts";
import type { TableCreateOptions } from "./table/get-table-create-from-zod.ts";
import type {
  InferZodRelaxedDataSchema,
  TableSchemaZod,
} from "./validation/zod/index.ts";

export type SqlDuckParams = {
  conn: DuckDBConnection;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
};

export type ToTableParams<TSchema extends TableSchemaZod> = {
  /**
   * The target table where the data will be inserted.
   * This object contains the table name and optionally the schema and database name.
   */
  table: Table;
  /**
   * A Zod schema that defines the structure of the table and the expected format of the rows in the `rowStream`.
   * The schema is used to generate the `CREATE TABLE` DDL and to convert row values to DuckDB types.
   */
  schema: TSchema;
  /**
   * An iterable (async or sync) or generator that yields rows to be inserted.
   * Each row must match the structure defined in the `schema`.
   */
  rowStream: RowStream<InferZodRelaxedDataSchema<TSchema>>;
  /**
   * The number of rows to accumulate before appending them to the DuckDB table as a single data chunk.
   * Tuning this value can impact memory usage and insertion performance.
   * Valid values are between 1 and 2048.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Configuration options for the `CREATE TABLE` statement (e.g., `IF NOT EXISTS`, `CREATE OR REPLACE`).
   * If omitted, a standard `CREATE TABLE` statement is used.
   */
  createOptions?: TableCreateOptions;
  /**
   * An optional callback invoked after each data chunk is successfully appended to the table.
   * Useful for tracking progress, logging statistics, or implementing custom hooks during the insertion process.
   */
  onChunkAppended?: OnChunkAppendedCb;

  /**
   * Specifies the frequency (in number of chunks) at which the `onChunkAppended` callback should be triggered.
   *
   * For example, if `chunkSize` is 2048 and `onChunkAppendedFrequency` is 5,
   * the callback will be called every 10,240 rows (5 chunks * 2048 rows/chunk).
   *
   * @default 1
   */
  onChunkAppendedFrequency?: number;

  /**
   * Specifies the frequency (in number of chunks) at which the `appender.flushSync()` should be called.
   * Calling `flushSync()` can help to clear internal buffers and make the data visible.
   *
   * For example, if `chunkSize` is 2048 and `flushSyncFrequency` is 5,
   * the appender will be flushed every 10,240 rows (5 chunks * 2048 rows/chunk).
   *
   * Each flush has a fixed cost, frequent flushes slow down inserts
   * (~30% slower with 10 than 100 on a file database).
   * @default 100
   */
  flushSyncFrequency?: number;

  /**
   * If set to `true`, a checkpoint is automatically performed after all rows from the `rowStream` have been processed.
   * This ensures that all data is persisted and WAL is cleared.
   * @default true
   */
  autoCheckpoint?: boolean;

  /**
   * Specifies the frequency (in number of chunks) at which a checkpoint should be triggered.
   *
   * For example, if `chunkSize` is 2048 and `checkpointChunksFrequency` is 5,
   * a checkpoint will occur every 10,240 rows (5 chunks * 2048 rows/chunk).
   */
  checkpointChunksFrequency?: number;

  /**
   * Controls DuckDB's `preserve_insertion_order` session setting while the data is being appended.
   *
   * When set to `false`, DuckDB is allowed to reorder rows (e.g. across threads) in exchange for
   * improved performance and lower memory usage. The original session value is captured before
   * the change and restored once the insertion completes, whether it succeeds or fails.
   *
   * If omitted, the session's current `preserve_insertion_order` setting is left untouched.
   * @see {@link https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads.html#preserving-insertion-order}
   */
  preserveInsertionOrder?: boolean;

  /**
   * Aborts the insertion, `toTable` then rejects with `signal.reason` (an
   * `AbortError` DOMException by default) and closes `rowStream`.
   *
   * The signal is checked before each row: the table is still created, and
   * the chunks appended before the abort are kept, but no checkpoint happens.
   */
  signal?: AbortSignal;
};

export type ToTableResult = {
  /**
   * Total time taken to insert the data in milliseconds.
   */
  timeMs: number;
  /**
   * Total number of rows inserted into the table.
   */
  totalRows: number;
  /**
   * The DDL statement used to create the table.
   */
  createTableDDL: string;
};

const createOptionToMode = {
  CREATE: "create",
  CREATE_OR_REPLACE: "createOrReplace",
  IF_NOT_EXISTS: "createIfNotExists",
} as const satisfies Record<
  NonNullable<TableCreateOptions["create"]>,
  LoadMode
>;

export class SqlDuck {
  readonly #conn: DuckDBConnection;
  readonly #logger: Logger;

  constructor(params: SqlDuckParams) {
    this.#conn = params.conn;
    this.#logger = params.logger ?? sqlduckDefaultLogtapeLogger;
  }

  /**
   * Create a table from a Zod schema and fill it with data from a row stream.
   *
   * @example
   * ```typescript
   * import * as z from 'zod';
   *
   * const sqlDuck = new SqlDuck({ conn: duckDbConnection });
   *
   * // Schema of the table, not that you can use meta to add information
   * const userSchema = z.object({
   *  id: z.number().int().meta({ primaryKey: true }),
   *  name: z.string(),
   * });
   *
   * // Async generator function that yields rows to insert
   * async function* getUserRows(): AsyncIterableIterator<z.infer<typeof userSchema>> {
   *   // database or api call
   * }
   *
   * const result = sqlDuck.toTable({
   *  table: new Table({ name: 'user', database: 'mydb' }),
   *  schema: userSchema,
   *  rowStream: getUserRows(),
   *  chunkSize: 2048,
   *  flushSyncFrequency: 100, // flush after every 100 chunks
   *  onChunkAppendedFrequency: 1, // multiple of chunks
   *  onChunkAppended: ({ totalRows }) => {
   *    console.log(`Appended ${totalRows} rows so far`);
   *  },
   *  autoCheckpoint: true,
   *  checkpointChunksFrequency: 100, // checkpoint after every 100 chunks
   *  preserveInsertionOrder: false, // allow DuckDB to reorder rows for performance
   *  createOptions: {
   *    create: 'CREATE_OR_REPLACE',
   *  },
   * });
   *
   * console.log(`Inserted ${result.totalRows} rows in ${result.timeMs}ms`);
   * console.log(`Table created with DDL: ${result.createTableDDL}`);
   * ```
   */
  toTable = async <TSchema extends ZodObject>(
    params: ToTableParams<TSchema>
  ): Promise<ToTableResult> => {
    const {
      table,
      schema,
      chunkSize = 2048,
      rowStream,
      createOptions,
      onChunkAppended,
      onChunkAppendedFrequency,
      flushSyncFrequency = 100,
      autoCheckpoint = true,
      checkpointChunksFrequency,
      preserveInsertionOrder,
      signal,
    } = params;

    // Validated here to keep error messages naming the toTable options
    const strategy = new ChunkAppenderStrategy({
      chunkSize,
      flushEvery: flushSyncFrequency,
    });

    if (autoCheckpoint && table.databaseName === undefined) {
      throw new Error(
        "autoCheckpoint requires table.databaseName to be provided."
      );
    }

    if (
      checkpointChunksFrequency !== undefined &&
      table.databaseName === undefined
    ) {
      throw new Error(
        "checkpointChunksFrequency requires table.databaseName to be provided."
      );
    }

    assertFrequency(checkpointChunksFrequency, "checkpointChunksFrequency");
    assertFrequency(onChunkAppendedFrequency, "onChunkAppendedFrequency");
    assertFrequency(flushSyncFrequency, "flushSyncFrequency");

    const { timeMs, totalRows, createTableDDL } = await new DuckTableLoader({
      conn: this.#conn,
      logger: this.#logger,
      strategy,
    }).load({
      table,
      schema,
      rows: rowStream,
      mode: createOptionToMode[createOptions?.create ?? "CREATE"],
      checkpoint: {
        every: checkpointChunksFrequency,
        onComplete: autoCheckpoint,
      },
      preserveInsertionOrder,
      onProgress: onChunkAppended,
      progressEvery: onChunkAppendedFrequency,
      signal,
    });

    return { timeMs, totalRows, createTableDDL };
  };
}

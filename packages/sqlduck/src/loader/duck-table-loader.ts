import type {
  DuckDBConnection,
  DuckDBType,
  DuckDBValue,
} from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";

import { createDuckColumnConverters } from "../converter/create-duck-column-converters.ts";
import { sqlduckDefaultLogtapeLogger } from "../logger/sqlduck-default-logtape-logger.ts";
import { createTableFromZod } from "../table/create-table-from-zod.ts";
import { getTableCreateFromZod } from "../table/get-table-create-from-zod.ts";
import type { TableCreateOptions } from "../table/get-table-create-from-zod.ts";
import { getErrorMessage } from "../utils/get-error-message.ts";
import { quoteIdentifier } from "../utils/quote-value.ts";
import { rowsToConvertedColumnsChunks } from "../utils/rows-to-converted-columns-chunks.ts";
import type { ChunkYieldRequest } from "../utils/rows-to-converted-columns-chunks.ts";
import type { TableSchemaZod } from "../validation/zod/index.ts";
import { createProgressCollector } from "./progress/progress-collector.ts";
import { ChunkAppenderStrategy } from "./strategies/chunk-appender/chunk-appender-strategy.ts";
import type {
  LoadMode,
  LoadParams,
  LoadResult,
  LoadStrategy,
  LoadStrategySession,
} from "./types.ts";
import { assertPositiveInteger } from "./utils/assert-positive-integer.ts";
import { crossedEveryRows } from "./utils/crossed-every-rows.ts";
import {
  assertSameColumns,
  getExistingColumnNames,
} from "./utils/get-existing-column-names.ts";
import { resolveTableDatabase } from "./utils/resolve-table-database.ts";

export type DuckTableLoaderParams = {
  conn: DuckDBConnection;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
  /**
   * How rows are written into the table.
   * @default new ChunkAppenderStrategy()
   */
  strategy?: LoadStrategy;
};

const DEFAULT_PROGRESS_INTERVAL_MS = 1000;

const modeToCreateOption = {
  create: "CREATE",
  createOrReplace: "CREATE_OR_REPLACE",
  createIfNotExists: "IF_NOT_EXISTS",
} as const satisfies Record<
  Exclude<LoadMode, "append">,
  NonNullable<TableCreateOptions["create"]>
>;

/**
 * Create a table from a Zod schema and load rows into it.
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new ChunkAppenderStrategy({ chunkSize: 2048 }),
 * });
 *
 * const result = await loader.load({
 *   table: new Table({ name: 'user', database: 'mydb' }),
 *   schema: userSchema,
 *   rows: getUserRows(),
 *   mode: 'createOrReplace',
 *   checkpoint: { everyRows: 1_000_000 },
 *   progress: {
 *     intervalMs: 1000, // the default, or everyRows: 100_000
 *     onProgress: ({ totalRows, intervalMs, rowsPerSecond }) => {
 *       // totalRows: rows loaded so far
 *       // intervalMs: time since the previous call
 *       // rowsPerSecond: rate since the previous call
 *       console.log(`${totalRows} rows loaded, ${rowsPerSecond} rows/s over ${intervalMs}ms`);
 *     },
 *   },
 * });
 * ```
 */
export class DuckTableLoader {
  readonly #conn: DuckDBConnection;
  readonly #logger: Logger;
  readonly #strategy: LoadStrategy;

  constructor(params: DuckTableLoaderParams) {
    this.#conn = params.conn;
    this.#logger = params.logger ?? sqlduckDefaultLogtapeLogger;
    this.#strategy = params.strategy ?? new ChunkAppenderStrategy();
  }

  load = async <TSchema extends TableSchemaZod>(
    params: LoadParams<TSchema>
  ): Promise<LoadResult> => {
    const {
      table,
      schema,
      rows,
      mode = "create",
      checkpoint,
      progress,
      signal,
    } = params;
    const checkpointEveryRows = checkpoint?.everyRows;
    const strategy = this.#strategy;
    const conn = this.#conn;

    assertPositiveInteger(checkpointEveryRows, "checkpoint.everyRows");
    assertPositiveInteger(progress?.everyRows, "progress.everyRows");
    if (
      progress?.intervalMs !== undefined &&
      !(Number.isFinite(progress.intervalMs) && progress.intervalMs >= 0)
    ) {
      throw new Error(
        `progress.intervalMs must be a non-negative number, got ${progress.intervalMs}`
      );
    }
    assertPositiveInteger(strategy.chunkSize, "strategy.chunkSize");

    signal?.throwIfAborted();

    const timeStart = performance.now();
    const tableFullName = table.getFullName();

    // Checkpoints only matter for databases stored in a file
    const database = await resolveTableDatabase(conn, table);
    const checkpointOnComplete = checkpoint?.onComplete ?? database.isFile;

    // The appender strategies write values by position: an existing table
    // must have the schema columns, in the same order.
    const { columnTypes } = getTableCreateFromZod({ table, schema });
    const columnNames = [...columnTypes.keys()] as string[];
    if (mode === "append" || mode === "createIfNotExists") {
      const existingColumns = await getExistingColumnNames(conn, table);
      if (existingColumns === undefined) {
        if (mode === "append") {
          throw new Error(
            `Table '${tableFullName}' does not exist, use mode 'create' or 'createIfNotExists' to create it.`
          );
        }
      } else {
        assertSameColumns(table, existingColumns, columnNames);
      }
    }

    let createTableDDL: string | undefined;
    if (mode !== "append") {
      const created = await createTableFromZod({
        conn,
        logger: this.#logger,
        schema,
        table,
        options: { create: modeToCreateOption[mode] },
      });
      createTableDDL = created.ddl;
    }

    const converters = createDuckColumnConverters(
      Object.fromEntries(columnTypes) as Record<string, DuckDBType>
    );

    // Time based progress. Chunks can take long to fill with a slow source,
    // so a timer asks the chunker to yield the rows read so far once the
    // interval is due: progress doesn't depend on the chunk size. Not needed
    // with intervalMs 0 (every chunk) or everyRows.
    const progressIntervalMs =
      progress === undefined || progress.everyRows !== undefined
        ? undefined
        : (progress.intervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS);
    const yieldRequest: ChunkYieldRequest = { requested: false };
    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    let progressTimerFired = false;
    const armProgressTimer = (): void => {
      clearTimeout(progressTimer);
      progressTimerFired = false;
      yieldRequest.requested = false;
      if (progressIntervalMs !== undefined && progressIntervalMs > 0) {
        progressTimer = setTimeout(() => {
          progressTimerFired = true;
          yieldRequest.requested = true;
        }, progressIntervalMs);
        // Never keeps the process alive
        progressTimer.unref();
      }
    };

    // Rows are typed by the schema, the columns come from the same schema
    const columnStream = rowsToConvertedColumnsChunks<Record<string, unknown>>({
      rows,
      chunkSize: strategy.chunkSize,
      columns: columnNames,
      converters,
      signal,
      yieldRequest,
    });

    let totalRows = 0;
    let reportedRows = 0;
    let lastProgressTime = timeStart;
    const collectProgress = createProgressCollector();
    const isProgressDue = (previousRows: number): boolean => {
      if (progress === undefined) {
        return false;
      }
      if (progress.everyRows !== undefined) {
        return crossedEveryRows(progress.everyRows, previousRows, totalRows);
      }
      return (
        // Timers can fire a bit early, the timer is the reference
        progressTimerFired ||
        performance.now() - lastProgressTime >= (progressIntervalMs ?? 0)
      );
    };
    const reportProgress = async (): Promise<void> => {
      reportedRows = totalRows;
      // Await any returned promise (async functions, but also regular
      // functions returning a promise) for backpressure and errors
      const returned = progress?.onProgress(
        collectProgress(totalRows)
      ) as unknown;
      if (returned instanceof Promise) {
        await returned;
      }
      // The next interval starts once the callback is done: a callback
      // slower than intervalMs must not make the next chunks tiny
      lastProgressTime = performance.now();
      armProgressTimer();
    };

    let session: LoadStrategySession | undefined;
    try {
      session = await strategy.open({
        conn,
        table,
        columnNames,
        columnTypes: [...columnTypes.values()],
        logger: this.#logger,
      });

      if (progress !== undefined) {
        lastProgressTime = performance.now();
        armProgressTimer();
      }
      for await (const dataChunk of columnStream) {
        const columns = dataChunk as DuckDBValue[][];

        const appended = session.appendChunk(columns);
        if (appended instanceof Promise) {
          await appended;
        }
        const previousRows = totalRows;
        totalRows += columns[0]?.length ?? 0;

        if (isProgressDue(previousRows)) {
          await reportProgress();
        }

        if (
          checkpointEveryRows !== undefined &&
          crossedEveryRows(checkpointEveryRows, previousRows, totalRows)
        ) {
          await this.#tryCheckpoint(
            database.name,
            tableFullName,
            "Failed to checkpoint database '{database}' while loading data into table '{table}' - {errorMessage}"
          );
        }
      }

      const completed = session.complete();
      if (completed instanceof Promise) {
        await completed;
      }
      session = undefined;

      if (checkpointOnComplete) {
        await this.#tryCheckpoint(
          database.name,
          tableFullName,
          "Failed to checkpoint database '{database}' after loading data into table '{table}' - {errorMessage}"
        );
      }

      // Progress always ends with the total. The rows are committed: a
      // failing callback is logged, it must not report a failed load (a
      // retry would load the rows twice).
      if (progress !== undefined && reportedRows !== totalRows) {
        try {
          await reportProgress();
        } catch (error) {
          this.#logger.warning(
            "onProgress failed after loading {totalRows} rows into table '{table}' - {errorMessage}",
            {
              table: tableFullName,
              totalRows,
              errorMessage: getErrorMessage(error),
            }
          );
        }
      }

      const timeMs = Math.round(performance.now() - timeStart);
      this.#logger.info(
        "Loaded {totalRows} rows into table '{table}' in {timeMs}ms",
        {
          table: tableFullName,
          timeMs,
          totalRows,
        }
      );

      return {
        timeMs,
        totalRows,
        createTableDDL,
        strategy: strategy.name,
        mode,
      };
    } catch (error) {
      // A failing abort must not hide the original error
      try {
        await session?.abort();
      } catch (abortError) {
        this.#logger.warning(
          "Failed to close the {strategy} session of table '{table}' - {errorMessage}",
          {
            strategy: strategy.name,
            table: tableFullName,
            errorMessage: getErrorMessage(abortError),
          }
        );
      }
      if (signal?.aborted === true && error === signal.reason) {
        this.#logger.warning(
          "Aborted loading data into table '{table}' after {totalRows} rows",
          {
            table: tableFullName,
            totalRows,
          }
        );
        // Not wrapped so callers can check for an AbortError
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      this.#logger.error(
        "Failed to load data into table '{table}' after {totalRows} rows - {errorMessage}",
        {
          table: tableFullName,
          totalRows,
          errorMessage,
        }
      );
      throw new Error(
        `Failed to load data into table '${tableFullName}' - ${errorMessage}`,
        {
          cause: error,
        }
      );
    } finally {
      clearTimeout(progressTimer);
    }
  };

  readonly #tryCheckpoint = async (
    database: string,
    tableFullName: string,
    failureMessage: string
  ): Promise<void> => {
    try {
      // Quoted: database names come from file names (ie: 'my-data'), the
      // stricter alias validation of DuckDatabaseManager would reject them
      await this.#conn.run(`CHECKPOINT ${quoteIdentifier(database)}`);
    } catch (error) {
      this.#logger.warning(failureMessage, {
        database,
        table: tableFullName,
        errorMessage: getErrorMessage(error),
      });
    }
  };
}

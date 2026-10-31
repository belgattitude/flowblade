import type {
  DuckDBConnection,
  DuckDBType,
  DuckDBValue,
} from "@duckdb/node-api";
import type { Logger } from "@logtape/logtape";
import type * as z from "zod";
import type { ZodObject } from "zod";

import { createDuckColumnConverters } from "../converter/create-duck-column-converters.ts";
import { sqlduckDefaultLogtapeLogger } from "../logger/sqlduck-default-logtape-logger.ts";
import { DuckDatabaseManager } from "../manager/database/duck-database-manager.ts";
import { createTableFromZod } from "../table/create-table-from-zod.ts";
import type { TableCreateOptions } from "../table/get-table-create-from-zod.ts";
import { getErrorMessage } from "../utils/get-error-message.ts";
import { rowsToConvertedColumnsChunks } from "../utils/rows-to-converted-columns-chunks.ts";
import type { InferZodRelaxedDataSchema } from "../validation/zod/index.ts";
import {
  restorePreserveInsertionOrder,
  setPreserveInsertionOrder,
} from "./policies/preserve-insertion-order.ts";
import { createProgressCollector } from "./progress/progress-collector.ts";
import { ChunkAppenderStrategy } from "./strategies/chunk-appender/chunk-appender-strategy.ts";
import type {
  LoadMode,
  LoadParams,
  LoadResult,
  LoadStrategy,
  LoadStrategySession,
} from "./types.ts";
import { assertFrequency } from "./utils/assert-frequency.ts";

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

const modeToCreateOption = {
  create: "CREATE",
  createOrReplace: "CREATE_OR_REPLACE",
  createIfNotExists: "IF_NOT_EXISTS",
} as const satisfies Record<
  LoadMode,
  NonNullable<TableCreateOptions["create"]>
>;

/**
 * Create a table from a Zod schema and load rows into it.
 *
 * @example
 * ```typescript
 * const loader = new DuckTableLoader({
 *   conn,
 *   strategy: new ChunkAppenderStrategy({ chunkSize: 2048, flushEvery: 100 }),
 * });
 *
 * const result = await loader.load({
 *   table: new Table({ name: 'user', database: 'mydb' }),
 *   schema: userSchema,
 *   rows: getUserRows(),
 *   mode: 'createOrReplace',
 *   checkpoint: { every: 100, onComplete: true },
 *   onProgress: ({ totalRows }) => {
 *     console.log(`Loaded ${totalRows} rows so far`);
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

  load = async <TSchema extends ZodObject>(
    params: LoadParams<TSchema>
  ): Promise<LoadResult> => {
    const {
      table,
      schema,
      rows,
      mode = "create",
      checkpoint,
      preserveInsertionOrder,
      onProgress,
      progressEvery,
      signal,
    } = params;
    const {
      every: checkpointEvery,
      onComplete: checkpointOnComplete = table.databaseName !== undefined,
    } = checkpoint ?? {};
    const strategy = this.#strategy;

    if (checkpointOnComplete && table.databaseName === undefined) {
      throw new Error(
        "checkpoint.onComplete requires table.databaseName to be provided."
      );
    }
    if (checkpointEvery !== undefined && table.databaseName === undefined) {
      throw new Error(
        "checkpoint.every requires table.databaseName to be provided."
      );
    }
    assertFrequency(checkpointEvery, "checkpoint.every");
    assertFrequency(progressEvery, "progressEvery");

    signal?.throwIfAborted();

    const dbManager = new DuckDatabaseManager(this.#conn);

    const timeStart = Date.now();

    const { columnTypes, ddl } = await createTableFromZod({
      conn: this.#conn,
      schema,
      table,
      options: { create: modeToCreateOption[mode] },
    });

    const columnTypeIds = {} as Record<keyof z.output<TSchema>, DuckDBType>;
    const columnKeys = [] as (keyof z.output<TSchema>)[];
    for (const [key, duckType] of columnTypes) {
      columnKeys.push(key);
      columnTypeIds[key as keyof z.output<TSchema>] = duckType;
    }

    const converters = createDuckColumnConverters(columnTypeIds);

    const columnStream = rowsToConvertedColumnsChunks<
      InferZodRelaxedDataSchema<TSchema>
    >({
      rows,
      chunkSize: strategy.chunkSize,
      columns: columnKeys as (keyof TSchema["shape"])[],
      converters,
      signal,
    });

    const progressCollector = createProgressCollector();
    const tableFullName = table.getFullName();

    let totalRows = 0;
    let chunkCount = 0;
    // Set once the session setting has been changed, to restore it in finally
    let originalPreserveInsertionOrder: boolean | undefined;
    let session: LoadStrategySession | undefined;
    try {
      if (preserveInsertionOrder !== undefined) {
        originalPreserveInsertionOrder = await setPreserveInsertionOrder(
          this.#conn,
          preserveInsertionOrder
        );
      }

      session = await strategy.open({
        conn: this.#conn,
        table,
        columnNames: [...columnTypes.keys()],
        columnTypes: [...columnTypes.values()],
        logger: this.#logger,
      });

      for await (const dataChunk of columnStream) {
        const columns = dataChunk as DuckDBValue[][];
        totalRows += columns[0]?.length ?? 0;

        const appended = session.appendChunk(columns);
        if (appended instanceof Promise) {
          await appended;
        }
        chunkCount += 1;

        if (
          onProgress !== undefined &&
          (progressEvery === undefined || chunkCount % progressEvery === 0)
        ) {
          // Await any returned promise (async functions, but also regular
          // functions returning a promise) for backpressure and errors
          const returned = onProgress(progressCollector(totalRows)) as unknown;
          if (returned instanceof Promise) {
            await returned;
          }
        }

        if (
          checkpointEvery !== undefined &&
          chunkCount % checkpointEvery === 0 &&
          table.databaseName !== undefined
        ) {
          await this.#tryCheckpoint(
            dbManager,
            table.databaseName,
            tableFullName,
            "Failed to checkpoint database '{database}' after appending chunk into table '{table}' - {errorMessage}"
          );
        }
      }

      const completed = session.complete();
      if (completed instanceof Promise) {
        await completed;
      }
      session = undefined;

      if (checkpointOnComplete && table.databaseName !== undefined) {
        await this.#tryCheckpoint(
          dbManager,
          table.databaseName,
          tableFullName,
          "Failed to checkpoint database '{database}' after appending data into table '{table}' - {errorMessage}"
        );
      }

      const timeMs = Date.now() - timeStart;
      this.#logger.info(
        "Successfully appended {totalRows} rows into '{table}' in {timeMs}ms",
        {
          table: tableFullName,
          timeMs,
          totalRows,
        }
      );

      return {
        timeMs,
        totalRows,
        createTableDDL: ddl,
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
          "Aborted appending data into table '{table}' after {totalRows} rows",
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
        "Failed to append data into table '{table}' - {errorMessage}",
        {
          table: tableFullName,
          errorMessage,
        }
      );
      throw new Error(
        `Failed to append data into table '${tableFullName}' - ${errorMessage}`,
        {
          cause: error,
        }
      );
    } finally {
      if (originalPreserveInsertionOrder !== undefined) {
        try {
          await restorePreserveInsertionOrder(
            this.#conn,
            originalPreserveInsertionOrder
          );
        } catch (error) {
          this.#logger.warning(
            "Failed to restore preserve_insertion_order to {value} after appending data into table '{table}' - {errorMessage}",
            {
              value: originalPreserveInsertionOrder,
              table: tableFullName,
              errorMessage: getErrorMessage(error),
            }
          );
        }
      }
    }
  };

  readonly #tryCheckpoint = async (
    dbManager: DuckDatabaseManager,
    database: string,
    tableFullName: string,
    failureMessage: string
  ): Promise<void> => {
    try {
      await dbManager.checkpoint(database);
    } catch (error) {
      this.#logger.warning(failureMessage, {
        database,
        table: tableFullName,
        errorMessage: getErrorMessage(error),
      });
    }
  };
}

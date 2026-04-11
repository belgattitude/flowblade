import {
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBType,
} from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

import {
  createOnChunkAppendedCollector,
  isOnChunkAppendedAsyncCb,
  type OnChunkAppendedCb,
} from './appender/data-appender-callback.ts';
import { createDuckColumnConverters } from './converter/create-duck-column-converters.ts';
import { sqlduckDefaultLogtapeLogger } from './logger/sqlduck-default-logtape-logger.ts';
import { DuckDatabaseManager } from './manager/database/duck-database-manager.ts';
import type { Table } from './objects/table.ts';
import { createTableFromZod } from './table/create-table-from-zod.ts';
import type { TableCreateOptions } from './table/get-table-create-from-zod.ts';
import type { TableSchemaZod } from './table/table-schema-zod.type.ts';
import { rowsToColumnsChunks } from './utils/rows-to-columns-chunks.ts';

export type SqlDuckParams = {
  conn: DuckDBConnection;
  /**
   * Optional logtape/logger to use for logging.
   * If not provided, a default logger will be used.
   * @see {@link https://github.com/logtape/logtape}
   */
  logger?: Logger;
};

type RowStream<T> = AsyncIterableIterator<T> | AsyncGenerator<T> | Generator<T>;

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
  rowStream: RowStream<z.infer<TSchema>>;
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

export class SqlDuck {
  #conn: DuckDBConnection;
  #logger: Logger;

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
   *  onChunkAppended: ({ totalRows }) => {
   *    console.log(`Appended ${totalRows} rows so far`);
   *  },
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
      autoCheckpoint = true,
      checkpointChunksFrequency,
    } = params;

    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 2048) {
      throw new Error('chunkSize must be a number between 1 and 2048');
    }

    if (autoCheckpoint && typeof table.databaseName !== 'string') {
      throw new Error(
        'autoCheckpoint requires table.databaseName to be provided.'
      );
    }

    if (
      checkpointChunksFrequency !== undefined &&
      typeof table.databaseName !== 'string'
    ) {
      throw new Error(
        'checkpointChunksFrequency requires table.databaseName to be provided.'
      );
    }

    if (
      checkpointChunksFrequency !== undefined &&
      (checkpointChunksFrequency < 1 || checkpointChunksFrequency > 100_000)
    ) {
      throw new Error(
        'checkpointChunksFrequency must be a number between 1 and 100_000.'
      );
    }

    if (
      onChunkAppendedFrequency !== undefined &&
      (onChunkAppendedFrequency < 1 || onChunkAppendedFrequency > 100_000)
    ) {
      throw new Error(
        'onChunkAppendedFrequency must be a number between 1 and 100_000.'
      );
    }

    const dbManager = new DuckDatabaseManager(this.#conn);

    const timeStart = Date.now();

    const { columnTypes, ddl } = await createTableFromZod({
      conn: this.#conn,
      schema,
      table,
      options: createOptions,
    });

    const appender = await this.#conn.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );

    const chunkTypes = Array.from(columnTypes.values());

    const columnTypeIds = {} as Record<keyof z.output<TSchema>, DuckDBType>;
    const columnKeys = [] as (keyof z.output<TSchema>)[];
    for (const [key, duckType] of columnTypes) {
      columnKeys.push(key as keyof z.output<TSchema>);
      columnTypeIds[key as keyof z.output<TSchema>] = duckType;
    }
    const numColumns = columnKeys.length;

    const transformers = createDuckColumnConverters(columnTypeIds);

    let totalRows = 0;

    const chunkAppendedCollector = createOnChunkAppendedCollector();

    const columnStream = rowsToColumnsChunks<z.output<TSchema>>({
      rows: rowStream,
      chunkSize: chunkSize,
      transformers: transformers,
    });

    let appendedChunkCount = 0;

    const tableFullName = table.getFullName();
    const tableName = table.tableName;
    try {
      const isAsyncCb =
        onChunkAppended !== undefined &&
        isOnChunkAppendedAsyncCb(onChunkAppended);

      for await (const dataChunk of columnStream) {
        const chunk = DuckDBDataChunk.create(chunkTypes);

        // eslint-disable-next-line unicorn/no-new-array, @typescript-eslint/no-explicit-any
        const columns = new Array<any[]>(numColumns);
        for (let i = 0; i < numColumns; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columns[i] = dataChunk[columnKeys[i]] as any[];
        }

        totalRows += columns[0]?.length ?? 0;

        chunk.setColumns(columns);
        appender.appendDataChunk(chunk);

        appendedChunkCount += 1;

        if (
          onChunkAppended !== undefined &&
          (onChunkAppendedFrequency === undefined ||
            appendedChunkCount % onChunkAppendedFrequency === 0)
        ) {
          const payload = chunkAppendedCollector(totalRows);
          if (isAsyncCb) {
            await onChunkAppended(payload);
          } else {
            onChunkAppended(payload);
          }
        }

        // Checkpoint point frequency
        if (
          checkpointChunksFrequency !== undefined &&
          appendedChunkCount % checkpointChunksFrequency === 0 &&
          typeof table.databaseName === 'string'
        ) {
          try {
            await dbManager.checkpoint(table.databaseName);
          } catch (e) {
            this.#logger.warning(
              `Failed to checkpoint database '${table.databaseName}' after appending chunk into table '${tableName}' - ${(e as Error)?.message ?? ''}`,
              {
                table: tableFullName,
              }
            );
          }
        }
      }

      appender.closeSync();

      if (autoCheckpoint && typeof table.databaseName === 'string') {
        try {
          await dbManager.checkpoint(table.databaseName);
        } catch (e) {
          this.#logger.warning(
            `Failed to checkpoint database '${table.databaseName}' after appending data into table '${tableName}' - ${(e as Error)?.message ?? ''}`,
            {
              table: tableFullName,
            }
          );
        }
      }

      const timeMs = Math.round(Date.now() - timeStart);
      this.#logger.info(
        `Successfully appended ${totalRows} rows into '${table.getFullName()}' in ${timeMs}ms`,
        {
          table: tableFullName,
          timeMs: timeMs,
          totalRows: totalRows,
        }
      );

      return {
        timeMs,
        totalRows: totalRows,
        createTableDDL: ddl,
      };
    } catch (e) {
      appender.closeSync();
      const msg = `Failed to append data into table '${table.getFullName()}' - ${(e as Error)?.message ?? ''}`;
      this.#logger.error(msg, {
        table: table.getFullName(),
      });
      throw new Error(msg, {
        cause: e,
      });
    }
  };
}

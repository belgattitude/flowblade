import {
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBType,
} from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

import {
  createOnDataAppendedCollector,
  isOnDataAppendedAsyncCb,
  type OnDataAppendedCb,
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
   * Used to create and fill the data into the table
   */
  table: Table;
  /**
   * Schema describing the table structure and rowStream content
   */
  schema: TSchema;
  /**
   * Stream of rows to insert into the table
   */
  rowStream: RowStream<z.infer<TSchema>>;
  // rowStream: RowStream<TSchema['shape']>;
  /**
   * Chunk size when using appender to insert data.
   * Valid numbers between 1 and 2048.
   * @default 2048
   */
  chunkSize?: number;
  /**
   * Extra options when creating the table
   */
  createOptions?: TableCreateOptions;
  /**
   * Callback called each time a datachunk is appended to the table
   */
  onDataAppended?: OnDataAppendedCb;

  /**
   * Automatically checkpoint the table after all chunks have been appended.
   * @default true
   */
  autoCheckpoint?: boolean;

  /**
   * Checkpoint the table after 'n' chunks have been appended
   *
   * For example if the chunkSize is 2048, setting frequency to 2
   * will checkpoint the table every 4096 rows (2x chunksize)
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
   *  onDataAppended: ({ total }) => {
   *    console.log(`Appended ${total} rows so far`);
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
      onDataAppended,
      autoCheckpoint = true,
      checkpointChunksFrequency = 10,
    } = params;

    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 2048) {
      throw new Error('chunkSize must be a number between 1 and 2048');
    }

    if (autoCheckpoint && typeof table.databaseName !== 'string') {
      throw new Error(
        'autoCheckpoint requires table.databaseName to be provided.'
      );
    }

    if (checkpointChunksFrequency && typeof table.databaseName !== 'string') {
      throw new Error(
        'checkpointChunksFrequency requires table.databaseName to be provided.'
      );
    }

    if (
      checkpointChunksFrequency !== undefined &&
      checkpointChunksFrequency < 1
    ) {
      throw new Error('checkpointChunksFrequency must be a positive number.');
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

    const columnTypeIds = Object.fromEntries(
      Array.from(columnTypes).map(([key, duckType]) => {
        return [key, duckType];
      })
    ) as Record<keyof TSchema, DuckDBType>;

    const transformers = createDuckColumnConverters(columnTypeIds);

    let totalRows = 0;

    const dataAppendedCollector = createOnDataAppendedCollector();

    // @todo opportunity to optimize further by using duck datatype information
    const columnStream = rowsToColumnsChunks({
      rows: rowStream,
      chunkSize: chunkSize,
      transformers: transformers,
    });

    let appendedChunkCount = 0;

    try {
      for await (const dataChunk of columnStream) {
        const chunk = DuckDBDataChunk.create(chunkTypes);

        this.#logger.debug(`Inserting chunk of ${dataChunk.length} rows`, {
          table: table.getFullName(),
        });

        totalRows += dataChunk?.[0]?.length ?? 0;

        // @ts-expect-error need to rework rowsToColumnsChunks to return properly
        //                  infer the type of the dataChunk from the provided zod schema
        chunk.setColumns(dataChunk);
        appender.appendDataChunk(chunk);

        appender.flushSync();

        appendedChunkCount += 1;

        if (onDataAppended !== undefined) {
          const payload = dataAppendedCollector(totalRows);
          if (isOnDataAppendedAsyncCb(onDataAppended)) {
            await onDataAppended(payload);
          } else {
            onDataAppended(payload);
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
              `Failed to checkpoint database '${table.databaseName}' after appending chunk into table '${table.getFullName()}' - ${(e as Error)?.message ?? ''}`,
              {
                table: table.getFullName(),
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
            `Failed to checkpoint database '${table.databaseName}' after appending data into table '${table.getFullName()}' - ${(e as Error)?.message ?? ''}`,
            {
              table: table.getFullName(),
            }
          );
        }
      }

      const timeMs = Math.round(Date.now() - timeStart);
      this.#logger.info(
        `Successfully appended ${totalRows} rows into '${table.getFullName()}' in ${timeMs}ms`,
        {
          table: table.getFullName(),
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

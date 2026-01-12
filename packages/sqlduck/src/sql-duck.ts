import { type DuckDBConnection, DuckDBDataChunk } from '@duckdb/node-api';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import {
  createOnDataAppendedCollector,
  isOnDataAppendedAsyncCb,
  type OnDataAppendedCb,
} from './appender/data-appender-callback';
import { createTableFromZod } from './table/create-table-from-zod';
import type { TableCreateOptions } from './table/get-table-create-from-zod';
import type { Table } from './table/table';
import type { TableSchemaZod } from './table/table-schema-zod.type';

export type SqlDuckParams = {
  conn: DuckDBConnection;
  logger?: (msg: string) => void;
};

type RowStream<T> = AsyncIterableIterator<T>;

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
  #duck: DuckDBConnection;
  #logger: SqlDuckParams['logger'];

  constructor(params: SqlDuckParams) {
    this.#duck = params.conn;
    this.#logger = params.logger;
  }

  /**
   * Create a table from a Zod schema and fill it with data from a row stream.
   *
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
    } = params;

    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 2048) {
      throw new Error('chunkSize must be a number between 1 and 2048');
    }

    const timeStart = Date.now();

    const { columnTypes, ddl } = await createTableFromZod({
      conn: this.#duck,
      schema,
      table,
      options: createOptions,
    });

    const appender = await this.#duck.createAppender(
      table.tableName,
      table.schemaName,
      table.databaseName
    );

    const chunkTypes = columnTypes.map((v) => v[1]);

    let totalRows = 0;

    const dataAppendedCollector = createOnDataAppendedCollector();

    // @todo opportunity to optimize further by using duck datatype information
    const columnStream = rowsToColumnsChunks(rowStream, chunkSize);
    for await (const dataChunk of columnStream) {
      const chunk = DuckDBDataChunk.create(chunkTypes);

      if (this.#logger) {
        this.#logger(`Inserting chunk of ${dataChunk.length} rows`);
      }

      totalRows += dataChunk?.[0]?.length ?? 0;
      // @ts-expect-error will check this out when we know where
      //                  to place toDuckDbType
      chunk.setColumns(dataChunk);
      appender.appendDataChunk(chunk);

      appender.flushSync();

      if (onDataAppended !== undefined) {
        const payload = dataAppendedCollector(totalRows);
        if (isOnDataAppendedAsyncCb(onDataAppended)) {
          await onDataAppended(payload);
        } else {
          onDataAppended(payload);
        }
      }
    }

    return {
      timeMs: Math.round(Date.now() - timeStart),
      totalRows: totalRows,
      createTableDDL: ddl,
    };
  };
}

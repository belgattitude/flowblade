import { type DuckDBConnection, DuckDBDataChunk } from '@duckdb/node-api';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import { createTableFromZod } from './table/create-table-from-zod';
import type { TableCreateOptions } from './table/get-table-create-from-zod';
import type { Table } from './table/table';
import type { TableSchemaZod } from './table/table-schema-zod.type';

export type SqlDuckParams = {
  conn: DuckDBConnection;
  logger?: (msg: string) => void;
};

export type ToTableParams<TSchema extends TableSchemaZod> = {
  table: Table;
  schema: TSchema;
  rowStream: AsyncIterableIterator<z.infer<TSchema>>;
  chunkSize?: number;
  createOptions?: TableCreateOptions;
};

export type ToTableResult = {
  timeMs: number;
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

  toTable = async <TSchema extends ZodObject>(
    params: ToTableParams<TSchema>
  ): Promise<ToTableResult> => {
    const { table, schema, chunkSize, rowStream, createOptions } = params;

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

    const chunkLimit = chunkSize ?? 2048;

    let totalRows = 0;
    const columnStream = rowsToColumnsChunks(rowStream, chunkLimit);
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
    }

    return {
      timeMs: Math.round(Date.now() - timeStart),
      totalRows: totalRows,
      createTableDDL: ddl,
    };
  };
}

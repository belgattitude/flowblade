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

export class SqlDuck {
  #duck: DuckDBConnection;
  #logger: SqlDuckParams['logger'];

  constructor(params: SqlDuckParams) {
    this.#duck = params.conn;
    this.#logger = params.logger;
  }

  toTable = async <TSchema extends ZodObject>(
    params: ToTableParams<TSchema>
  ) => {
    const { table, schema, chunkSize, rowStream, createOptions } = params;

    const { columnTypes } = await createTableFromZod({
      conn: this.#duck,
      schema,
      table,
      options: createOptions,
    });

    const appender = await this.#duck.createAppender(
      table.fqTable.name,
      table.fqTable.schema,
      table.fqTable.database
    );

    const chunkTypes = columnTypes.map((v) => v[1]);

    const chunkLimit = chunkSize ?? 2048;

    const columnStream = rowsToColumnsChunks(rowStream, chunkLimit);
    for await (const dataChunk of columnStream) {
      const chunk = DuckDBDataChunk.create(chunkTypes);

      if (this.#logger) {
        this.#logger(`Inserting chunk of ${dataChunk.length} rows`);
      }

      // @ts-expect-error will check this out when we know where
      //                  to place toDuckDbType
      chunk.setColumns(dataChunk);
      appender.appendDataChunk(chunk);

      appender.flushSync();
    }

    return void 0;
  };
}

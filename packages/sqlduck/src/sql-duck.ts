import { type DuckDBConnection, DuckDBDataChunk } from '@duckdb/node-api';
import type { ZodObject } from 'zod';
import type * as z from 'zod';

import { rowsToColumnsChunks } from '../tests/utils/rows-to-columns';
import { getTableCreateFromZod } from './table/get-table-create-from-zod';
import type { Table } from './table/table';

export type SqlDuckParams = {
  conn: DuckDBConnection;
  logger?: (msg: string) => void;
};

export type ToTableParams<TSchema extends ZodObject> = {
  table: Table;
  schema: TSchema;
  rowStream: AsyncIterableIterator<z.infer<TSchema>>;
  chunkSize?: number;
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
    const { table, schema, chunkSize, rowStream } = params;
    const { ddl, columnTypes } = getTableCreateFromZod(table, schema);
    try {
      await this.#duck.run(ddl);
    } catch (e) {
      throw new Error(
        `Failed to create table '${table.getFullyQualifiedTableName()}': ${(e as Error).message}`,
        {
          cause: e as Error,
        }
      );
    }

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
      // chunk.reset();
    }

    return void 0;
    /**
    const result = await this.duck.streamAndRead(`select * from ${tableName}`);
    return result;
      */
  };
}

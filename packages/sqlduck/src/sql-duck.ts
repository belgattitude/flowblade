import {
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBValue,
} from '@duckdb/node-api';
import type { ZodObject } from 'zod';

import { getTableCreateFromZod } from './table/get-table-create-from-zod';
import type { Table } from './table/table';

export type SqlDuckParams = {
  conn: DuckDBConnection;
};

export class SqlDuck {
  private duck: DuckDBConnection;
  constructor(params: SqlDuckParams) {
    this.duck = params.conn;
  }

  toTable = async <TCol extends DuckDBValue[], TSchema extends ZodObject>(
    table: Table,
    schema: TSchema,
    columns: AsyncIterableIterator<TCol[]>
  ) => {
    const { ddl, columnTypes } = getTableCreateFromZod(table, schema);

    try {
      await this.duck.run(ddl);
    } catch (e) {
      throw new Error(
        `Failed to create table '${table.getFullyQualifiedTableName()}': ${(e as Error).message}`,
        {
          cause: e as Error,
        }
      );
    }

    const appender = await this.duck.createAppender(
      table.fqTable.name,
      table.fqTable.schema,
      table.fqTable.database
    );

    const types = columnTypes.map((v) => v[1]);
    for await (const dataChunk of columns) {
      const chunk = DuckDBDataChunk.create(types);

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

import {
  BIGINT,
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBValue,
  INTEGER,
  TIMESTAMP,
  VARCHAR,
} from '@duckdb/node-api';
import type { ZodObject } from 'zod';

import { getTableCreateFromZod } from './table/get-table-create-from-zod';

export type SqlDuckParams = {
  conn: DuckDBConnection;
};

export class SqlDuck {
  private duck: DuckDBConnection;
  constructor(params: SqlDuckParams) {
    this.duck = params.conn;
  }

  toTable = async <TCol extends DuckDBValue[], TSchema extends ZodObject>(
    tableName: string,
    schema: TSchema,
    columns: AsyncIterableIterator<TCol[]>
  ) => {
    try {
      await this.duck.run(getTableCreateFromZod(tableName, schema));
    } catch (e) {
      throw new Error(
        `Failed to create table '${tableName}': ${(e as Error).message}`,
        {
          cause: e as Error,
        }
      );
    }

    const appender = await this.duck.createAppender(
      'test',
      'main',
      'memory_db'
    );

    for await (const dataChunk of columns) {
      const chunk = DuckDBDataChunk.create([
        INTEGER,
        VARCHAR,
        VARCHAR,
        BIGINT,
        TIMESTAMP,
      ]);

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

import {
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBValue,
  INTEGER,
  TIMESTAMP,
  VARCHAR,
} from '@duckdb/node-api';

export type SqlDuckParams = {
  conn: DuckDBConnection;
};
export class SqlDuck {
  private duck: DuckDBConnection;
  constructor(params: SqlDuckParams) {
    this.duck = params.conn;
  }

  toTable = async <TCol extends DuckDBValue[]>(
    table: string,
    columns: AsyncIterableIterator<TCol[]>
  ) => {
    type ColdDef = {
      name: string;
      type: 'INTEGER' | 'VARCHAR' | 'TIMESTAMP';
      default?: string;
    };
    const _colDef = [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'email', type: 'VARCHAR' },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        default: 'current_localtimestamp()',
      },
    ] as const satisfies ColdDef[];

    try {
      await this.duck.run(
        `CREATE OR REPLACE TABLE ${table}(id INTEGER, name VARCHAR, email VARCHAR, created_at TIMESTAMP DEFAULT current_localtimestamp() )`
      );
    } catch (e) {
      throw new Error(
        `Failed to create table '${table}': ${(e as Error).message}`,
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

    const chunk = DuckDBDataChunk.create([
      INTEGER,
      VARCHAR,
      VARCHAR,
      TIMESTAMP,
    ]);

    for await (const dataChunk of columns) {
      chunk.setColumns(dataChunk);
      appender.appendDataChunk(chunk);
      appender.flushSync();
    }
    const result = await this.duck.streamAndRead(`select * from ${table}`);
    return result;
  };
}

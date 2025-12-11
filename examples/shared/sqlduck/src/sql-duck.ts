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
    columns: TCol[]
  ) => {
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
    chunk.setColumns(columns);
    appender.appendDataChunk(chunk);
    appender.flushSync();
    const result = await this.duck.streamAndRead(`select * from ${table}`);
    return result;
  };
}

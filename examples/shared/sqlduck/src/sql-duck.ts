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

  /**
   *
   * @param columns
   */
  test = async <TCol extends DuckDBValue[]>(columns: TCol[]) => {
    try {
      await this.duck.run(
        `create or replace table target_table(id integer, name varchar, created_at timestamp default current_localtimestamp() )`
      );
    } catch (e) {
      throw new Error(`Failed to create table: ${(e as Error).message}`, {
        cause: e as Error,
      });
    }

    const appender = await this.duck.createAppender('target_table');
    const chunk = DuckDBDataChunk.create([INTEGER, VARCHAR, TIMESTAMP]);
    chunk.setColumns(columns);
    appender.appendDataChunk(chunk);
    appender.flushSync();
    const result = await this.duck.streamAndRead(`select * from target_table`);
    return result;
  };
}

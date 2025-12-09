import {
  type DuckDBConnection,
  DuckDBDataChunk,
  type DuckDBValue,
  INTEGER,
  VARCHAR,
} from '@duckdb/node-api';
import type { DatasourceInterface } from '@flowblade/core';

export type SqlDuckParams = {
  ds?: DatasourceInterface;
  conn: DuckDBConnection;
};
export class SqlDuck {
  private params: SqlDuckParams;
  private duck: DuckDBConnection;
  constructor(params: SqlDuckParams) {
    this.params = params;
    this.duck = params.conn;
  }
  test = async <TCol extends DuckDBValue[]>(columns: TCol[]) => {
    await this.duck.run(
      `create or replace table target_table(i integer, v varchar)`
    );

    const appender = await this.duck.createAppender('target_table');
    const chunk = DuckDBDataChunk.create([INTEGER, VARCHAR]);
    chunk.setColumns(columns);
    appender.appendDataChunk(chunk);
    appender.flushSync();
    const result = this.duck.streamAndRead(`select * from target_table`);
    return result;
  };
}

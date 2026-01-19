import type { DuckDBConnection } from '@duckdb/node-api';

type GenericJSRowObject = Record<string, unknown>;
type GenericJsonRowObject = Record<string, unknown>;

export class DuckExec {
  #conn: DuckDBConnection;
  constructor(duckConn: DuckDBConnection) {
    this.#conn = duckConn;
  }
  getRowObjectJS = async <T extends GenericJSRowObject[]>(
    sql: string
  ): Promise<T> => {
    const res = await this.#conn.run(sql);
    return (await res.getRowObjectsJS()) as unknown as T;
  };
  getRowObjectJson = async <T extends GenericJSRowObject[]>(
    sql: string
  ): Promise<T> => {
    const res = await this.#conn.run(sql);
    return (await res.getRowObjectsJson()) as unknown as T;
  };
  getOneRowObjectJS = async <T extends GenericJsonRowObject>(
    sql: string
  ): Promise<T | null> => {
    const rows = await this.getRowObjectJS(sql);
    if (rows.length === 0) {
      return null;
    }
    this.#ensureOneRow(rows);
    return rows[0] as T;
  };
  getOneRowObjectJson = async <T extends GenericJsonRowObject>(
    sql: string
  ): Promise<T | null> => {
    const rows = await this.getRowObjectJson(sql);
    if (rows.length === 0) {
      return null;
    }
    this.#ensureOneRow(rows);
    return rows[0] as T;
  };

  #ensureOneRow = (
    rows: GenericJSRowObject[] | GenericJsonRowObject[]
  ): void => {
    if (rows.length > 1) {
      throw new Error('Expected one row, but got multiple rows');
    }
  };
}

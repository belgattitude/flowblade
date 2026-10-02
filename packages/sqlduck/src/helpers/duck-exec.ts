import type {
  DuckDBConnection,
  DuckDBMaterializedResult,
} from "@duckdb/node-api";

type GenericJSRowObject = Awaited<
  ReturnType<DuckDBMaterializedResult["getRowObjectsJS"]>
>[number];
type GenericJsonRowObject = Awaited<
  ReturnType<DuckDBMaterializedResult["getRowObjectsJson"]>
>[number];

export class DuckExec {
  readonly #conn: DuckDBConnection;
  constructor(duckConn: DuckDBConnection) {
    this.#conn = duckConn;
  }
  getRowObjectJS = async <T extends GenericJSRowObject[]>(
    sql: string
  ): Promise<T> => {
    const res = await this.#conn.run(sql);
    return (await res.getRowObjectsJS()) as T;
  };
  getRowObjectJson = async <T extends GenericJSRowObject[]>(
    sql: string
  ): Promise<T> => {
    const res = await this.#conn.run(sql);
    return (await res.getRowObjectsJson()) as T;
  };
  getOneRowObjectJS = async <T extends GenericJSRowObject>(
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

  readonly #ensureOneRow = (
    rows: GenericJSRowObject[] | GenericJsonRowObject[]
  ): void => {
    if (rows.length > 1) {
      throw new Error("Expected one row, but got multiple rows");
    }
  };
}

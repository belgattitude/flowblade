import type { DuckDBConnection } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';

export class ManagerQueryExecutor {
  #conn: DuckDBConnection;
  #logger: Logger;
  #className: string;

  constructor(
    conn: DuckDBConnection,
    className: string,
    params: { logger: Logger }
  ) {
    this.#conn = conn;
    this.#logger = params.logger;
    this.#className = className;
  }

  getRowObjectsJS = async <
    TRow extends Record<string, unknown> = Record<string, unknown>,
  >(
    name: string,
    rawSql: string
  ): Promise<TRow[]> => {
    const fnName = `${this.#className}.${name}`;
    const startTime = Date.now();
    try {
      const result = await this.#conn.runAndReadAll(rawSql);
      const timeMs = Math.round(Date.now() - startTime);
      const data = result.getRowObjectsJS();
      this.#logger.debug(`${fnName} in ${timeMs}ms`, {
        timeMs: timeMs,
      });
      return data as unknown as TRow[];
    } catch (e) {
      const msg = `Failed to run "${fnName}" - ${(e as Error)?.message ?? ''}`;
      const timeMs = Math.round(Date.now() - startTime);
      this.#logger.error(msg, {
        name: fnName,
        sql: rawSql,
        timeMs: timeMs,
      });
      throw new Error(msg, {
        cause: e,
      });
    }
  };
}

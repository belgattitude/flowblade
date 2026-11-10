import type {
  DuckDBConnection,
  DuckDBMaterializedResult,
  DuckDBValue,
} from "@duckdb/node-api";
import { withConnectionLock } from "@flowblade/source-duckdb";
import type { Logger } from "@logtape/logtape";

import { getErrorMessage } from "../../utils/get-error-message.ts";

type DefaultRow = Awaited<
  ReturnType<DuckDBMaterializedResult["getRowObjectsJS"]>
>[number];

export class ManagerQueryExecutor {
  readonly #conn: DuckDBConnection;
  readonly #logger: Logger;
  readonly #className: string;

  constructor(
    conn: DuckDBConnection,
    className: string,
    params: { logger: Logger }
  ) {
    this.#conn = conn;
    this.#logger = params.logger;
    this.#className = className;
  }

  getRowObjectsJS = async <TRow extends object = DefaultRow>(
    name: string,
    rawSql: string,
    /**
     * Values of the `$1`, `$2`... parameters. Unlike `rawSql` they are never
     * logged: bind sensitive values instead of inlining them.
     */
    values?: DuckDBValue[]
  ): Promise<TRow[]> => {
    const fnName = `${this.#className}.${name}`;
    const startTime = Date.now();
    try {
      const result = await withConnectionLock(this.#conn, () =>
        this.#conn.runAndReadAll(rawSql, values)
      );
      const timeMs = Date.now() - startTime;
      const data = result.getRowObjectsJS();
      this.#logger.debug("{name} in {timeMs}ms", {
        name: fnName,
        timeMs,
      });
      return data as TRow[];
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const timeMs = Date.now() - startTime;
      this.#logger.error('Failed to run "{name}" - {errorMessage}', {
        name: fnName,
        sql: rawSql,
        timeMs,
        errorMessage,
      });
      throw new Error(`Failed to run "${fnName}" - ${errorMessage}`, {
        cause: error,
      });
    }
  };
}

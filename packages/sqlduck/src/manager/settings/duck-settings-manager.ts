import type { DuckDBConnection } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';

import { sqlduckDefaultLogtapeLogger } from '../../logger/sqlduck-default-logtape-logger.ts';
import { ManagerQueryExecutor } from '../core/manager-query-executor.ts';

export class DuckSettingsManager {
  #conn: DuckDBConnection;
  #logger: Logger;
  #executor: ManagerQueryExecutor;
  readonly className = 'DuckSettingsManager';

  constructor(conn: DuckDBConnection, params?: { logger?: Logger }) {
    this.#conn = conn;
    this.#logger =
      params?.logger ??
      sqlduckDefaultLogtapeLogger.with({
        source: this.className,
      });
    this.#executor = new ManagerQueryExecutor(this.#conn, this.className, {
      logger: this.#logger,
    });
  }

  getCurrentSettings = async <T extends string>(
    settings: T[]
  ): Promise<Record<T, string>> => {
    const fnName = `${this.className}.getCurrentSettings`;
    const columns = settings
      .map((s) => {
        return `current_setting('${s}') as '${s}'`;
      })
      .join(',\n');

    const query = `SELECT ${columns}`;

    const rows = await this.#executor.getRowObjectsJS<Record<T, string>>(
      fnName,
      query
    );
    const firstRow = rows[0];
    if (firstRow === undefined) {
      const msg = `Failed to get current settings - no rows returned`;
      this.#logger.error(msg, {
        sql: query,
      });
      throw new Error(msg);
    }
    const currentSettings = {} as Record<T, string>;
    for (const [key, value] of Object.entries(firstRow)) {
      const v = typeof value === 'string' ? value : String(value);
      currentSettings[key as T] = v;
    }
    return currentSettings;
  };
}

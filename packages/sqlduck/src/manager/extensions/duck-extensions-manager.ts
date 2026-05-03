import type { DuckDBConnection } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';

import { sqlduckDefaultLogtapeLogger } from '../../logger/sqlduck-default-logtape-logger.ts';
import { ManagerQueryExecutor } from '../core/manager-query-executor.ts';

export class DuckExtensionsManager {
  #conn: DuckDBConnection;
  #logger: Logger;
  #executor: ManagerQueryExecutor;
  readonly className = 'DuckExtensionsManager';

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

  install = async (
    name: string,
    params?: {
      force?: boolean;
    }
  ): Promise<true> => {
    const { force } = params ?? {};
    await this.#executor.getRowObjectsJS(
      'install',
      `${force ? 'FORCE ' : ''} INSTALL ${name}`
    );
    return true;
  };

  search = async (filters?: { installed?: boolean; name?: string }) => {
    const { installed, name } = filters ?? {};

    const conditions = [
      installed === undefined
        ? ''
        : `installed = ${installed ? 'true' : 'false'}`,
      name === undefined ? '' : `extension_name = '${name}'`,
    ].filter(Boolean);

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.#executor.getRowObjectsJS<{
      extension_name: string;
      installed: boolean;
      description: string;
    }>(
      'showExtensions',
      `
         SELECT extension_name, installed, description
         FROM duckdb_extensions()
         ${where}
         ORDER BY extension_name
      `
    );
    return rows;
  };
}

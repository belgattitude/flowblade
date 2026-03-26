import type { DuckDBConnection } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';
import * as z from 'zod';

import { sqlduckDefaultLogtapeLogger } from '../../logger/sqlduck-default-logtape-logger.ts';
import { Database } from '../../objects/database.ts';
import { duckZodTableAliasSchema } from '../../validation/zod';
import {
  DuckDatabaseAttachCommand,
  type DuckDatabaseAttachCommandOptions,
} from './commands/duck-database-attach-command.ts';
import {
  type DuckDatabaseManagerDbParams,
  duckDatabaseManagerDbParamsSchema,
} from './duck-database-manager.schemas.ts';

export class DuckDatabaseManager {
  #conn: DuckDBConnection;
  #logger: Logger;
  constructor(conn: DuckDBConnection, params?: { logger?: Logger }) {
    this.#conn = conn;
    this.#logger =
      params?.logger ??
      sqlduckDefaultLogtapeLogger.with({
        source: 'DuckDatabaseManager',
      });
  }

  /**
   * Attach a database to the current connection
   *
   * @example
   * ```typescript
   * const dbManager = new DuckDatabaseManager(conn);
   * const database = dbManager.attach({
   *   type: ':memory:', // can be 'duckdb', 's3'...
   *   alias: 'mydb',
   *   options: { COMPRESS: 'true' }
   * });
   *
   * console.log(database.alias); // 'mydb'
   * ```
   */
  attach = async (
    dbParams: DuckDatabaseManagerDbParams,
    options?: DuckDatabaseAttachCommandOptions
  ) => {
    const params = z.parse(duckDatabaseManagerDbParamsSchema, dbParams);
    const rawSql = new DuckDatabaseAttachCommand(params, options).getRawSql();
    await this.#executeRawSqlCommand(`attach(${params.alias})`, rawSql);
    return new Database({ alias: params.alias });
  };

  attachOrReplace = async (dbParams: DuckDatabaseManagerDbParams) => {
    return this.attach(dbParams, {
      behaviour: 'OR REPLACE',
    });
  };

  attachIfNotExists = async (dbParams: DuckDatabaseManagerDbParams) => {
    return this.attach(dbParams, {
      behaviour: 'IF NOT EXISTS',
    });
  };

  showDatabases = async () => {
    return await this.#executeRawSqlCommand(
      'showDatabases()',
      `SHOW DATABASES`
    );
  };

  detach = async (dbAlias: string): Promise<boolean> => {
    const safeAlias = z.parse(duckZodTableAliasSchema, dbAlias);
    await this.#executeRawSqlCommand(
      `detach(${safeAlias})`,
      `DETACH ${safeAlias}`
    );
    return true;
  };

  detachIfExists = async (dbAlias: string): Promise<boolean> => {
    const safeAlias = z.parse(duckZodTableAliasSchema, dbAlias);
    await this.#executeRawSqlCommand(
      `detachIfExists(${safeAlias})`,
      `DETACH IF EXISTS ${safeAlias}`
    );
    return true;
  };

  /**
   * The statistics recomputed by the ANALYZE statement are only used for join order optimization.
   *
   * It is therefore recommended to recompute these statistics for improved join orders,
   * especially after performing large updates (inserts and/or deletes).
   *
   * @link https://duckdb.org/docs/stable/sql/statements/analyze
   */
  analyze = async (): Promise<boolean> => {
    await this.#executeRawSqlCommand('analyze()', 'ANALYZE');
    return true;
  };

  checkpoint = async (dbAlias: string): Promise<boolean> => {
    const safeAlias = z.parse(duckZodTableAliasSchema, dbAlias);
    await this.#executeRawSqlCommand(
      `checkpoint(${safeAlias})`,
      `CHECKPOINT ${safeAlias}`
    );
    return true;
  };

  #executeRawSqlCommand = async (name: string, rawSql: string) => {
    const startTime = Date.now();
    try {
      const result = await this.#conn.runAndReadAll(rawSql);
      const timeMs = Math.round(Date.now() - startTime);
      const data = result.getRowObjectsJS();
      this.#logger.info(`DuckDatabaseManager.${name} in ${timeMs}ms`, {
        timeMs: timeMs,
      });
      return data;
    } catch (e) {
      const msg = `DuckDatabaseManager: failed to run "${name}" - ${(e as Error)?.message ?? ''}`;
      const timeMs = Math.round(Date.now() - startTime);
      this.#logger.error(msg, {
        name,
        sql: rawSql,
        timeMs: timeMs,
      });
      throw new Error(msg, {
        cause: e,
      });
    }
  };
}

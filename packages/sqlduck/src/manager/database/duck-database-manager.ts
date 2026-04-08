import { type DuckDBConnection, DuckDBInstanceCache } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';

import { FileSystemUtils } from '../../filesystem/file-system-utils.ts';
import { sqlduckDefaultLogtapeLogger } from '../../logger/sqlduck-default-logtape-logger.ts';
import { Database } from '../../objects/database.ts';
import type { DuckConnectionParams } from '../../validation/core/types.ts';
import { duckConnectionParamsZodSchema } from '../../validation/zod/duck-connection-params-zod-schema.ts';
import {
  assertValidAliasName,
  duckValidatorsZod,
} from '../../validation/zod/index.ts';
import {
  DuckDatabaseAttachCommand,
  type DuckDatabaseAttachCommandOptions,
} from './commands/duck-database-attach-command.ts';

export class DuckDatabaseManager {
  #conn: DuckDBConnection;
  #logger: Logger;
  #fs: FileSystemUtils | undefined;

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
   *   type: 'memory', // can be 'filesystem'...
   *   alias: 'mydb',
   *   options: { COMPRESS: 'true' }
   * });
   *
   * console.log(database.alias); // 'mydb'
   * ```
   */
  attach = async (
    dbParams: DuckConnectionParams,
    options?: DuckDatabaseAttachCommandOptions
  ) => {
    const params = duckConnectionParamsZodSchema.parse(dbParams);
    const rawSql = new DuckDatabaseAttachCommand(params, options).getRawSql();
    const { behaviour } = options ?? {};
    await this.#executeRawSqlCommand(
      [`attach(${params.alias}`, behaviour ?? null, ')']
        .filter(Boolean)
        .join(','),
      rawSql
    );
    return new Database({ alias: params.alias });
  };

  attachOrReplace = async (dbParams: DuckConnectionParams) => {
    return this.attach(dbParams, {
      behaviour: 'OR REPLACE',
    });
  };

  attachIfNotExists = async (dbParams: DuckConnectionParams) => {
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
    assertValidAliasName(dbAlias);
    await this.#executeRawSqlCommand(`detach(${dbAlias})`, `DETACH ${dbAlias}`);
    return true;
  };

  detachIfExists = async (dbAlias: string): Promise<boolean> => {
    assertValidAliasName(dbAlias);
    await this.#executeRawSqlCommand(
      `detachIfExists(${dbAlias})`,
      `DETACH IF EXISTS ${dbAlias}`
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
    const safeAlias = duckValidatorsZod.aliasName.parse(dbAlias);
    await this.#executeRawSqlCommand(
      `checkpoint(${safeAlias})`,
      `CHECKPOINT ${safeAlias}`
    );
    return true;
  };

  vacuum = async (): Promise<boolean> => {
    await this.#executeRawSqlCommand('vacuum()', 'VACUUM');
    return true;
  };

  /**
   * Helper to create an initial database file.
   */
  createDatabaseFile = async (params: {
    path: string;
    createDirectory?: boolean;
  }): Promise<{ status: 'exists' | 'created' }> => {
    const startTime = Date.now();
    const { path, createDirectory = true } = params;

    const fs = this.#getFs();
    if (fs.isFile(path)) {
      return { status: 'exists' };
    }

    if (createDirectory) {
      const { directory } = fs.parsePath(path);
      fs.createAndEnsureWritableDirectory('database file directory', directory);
    }

    const instanceCache = new DuckDBInstanceCache();
    try {
      const instance = await instanceCache.getOrCreateInstance(path);
      const conn = await instance.connect();
      conn.closeSync();
      const timeMs = Math.round(Date.now() - startTime);
      this.#logger.info(
        `DuckDatabaseManager.createDatabaseFile('${path}') in ${timeMs}ms`,
        {
          timeMs: timeMs,
          path: path,
        }
      );
    } catch (e) {
      this.#logger.error(
        `DuckDatabaseManager.createDatabaseFile('${path}') failed - ${(e as Error)?.message ?? ''}`,
        {
          path: path,
        }
      );
      throw e;
    }
    return {
      status: 'created',
    };
  };

  #executeRawSqlCommand = async (name: string, rawSql: string) => {
    const startTime = Date.now();
    try {
      const result = await this.#conn.runAndReadAll(rawSql);
      const timeMs = Math.round(Date.now() - startTime);
      const data = result.getRowObjectsJS();
      this.#logger.debug(`DuckDatabaseManager.${name} in ${timeMs}ms`, {
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

  #getFs = (): FileSystemUtils => {
    if (this.#fs === undefined) {
      this.#fs = new FileSystemUtils({
        logger: this.#logger,
      });
    }
    return this.#fs;
  };
}

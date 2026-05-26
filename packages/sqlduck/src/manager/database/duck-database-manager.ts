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
import { ManagerQueryExecutor } from '../core/manager-query-executor.ts';
import {
  DuckDatabaseAttachCommand,
  type DuckDatabaseAttachCommandOptions,
} from './commands/duck-database-attach-command.ts';

export class DuckDatabaseManager {
  #conn: DuckDBConnection;
  #logger: Logger;
  #fs: FileSystemUtils | undefined;
  #executor: ManagerQueryExecutor;
  readonly className = 'DuckDatabaseManager';

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
    await this.#executor.getRowObjectsJS(
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

  /**
   * Check whether a specific database name / alias is currently attached
   */
  isAttached = async (dbAlias: string) => {
    assertValidAliasName(dbAlias);
    const rows = await this.#executor.getRowObjectsJS<{
      is_attached: boolean;
    }>(
      `isAttached(${dbAlias})`,
      `SELECT EXISTS (SELECT 1 
                FROM duckdb_databases() 
                WHERE database_name = '${dbAlias}'
              ) AS is_attached;`
    );
    return rows[0]?.is_attached ?? false;
  };

  /**
   * Return information about attached databases
   */
  getDatabases = async (params?: { includeInternal?: boolean }) => {
    const { includeInternal = false } = params ?? {};
    const internalFilter = includeInternal ? '1=1' : 'internal = false';
    return this.#executor.getRowObjectsJS<{
      database_name: string;
      database_oid: string;
      path: string | null;
      comment: string | null;
      type: string;
      readonly: boolean;
      internal: boolean;
      encrypted: boolean;
    }>(
      'listDatabases',
      `select database_name,
                     database_oid,
                     path,
                     comment,
                     type,
                     readonly,
                     internal,
                     encrypted
              from duckdb_databases()
              where ${internalFilter}`
    );
  };

  /**
   * Get the currently attached database names
   */
  showDatabases = async () => {
    return await this.#executor.getRowObjectsJS(
      'showDatabases()',
      `SHOW DATABASES`
    );
  };

  /**
   * @throws Error if the database isn't attached
   */
  detach = async (dbAlias: string): Promise<boolean> => {
    assertValidAliasName(dbAlias);
    await this.#executor.getRowObjectsJS(
      `detach(${dbAlias})`,
      `DETACH ${dbAlias}`
    );
    return true;
  };

  /**
   * @todo DETACH IF EXISTS is not supported in DuckDB as of v1.5.3
   */
  detachOrIgnore = async (dbAlias: string): Promise<boolean> => {
    assertValidAliasName(dbAlias);
    try {
      await this.detach(dbAlias);
    } catch {
      return false;
    }
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
    await this.#executor.getRowObjectsJS('analyze()', 'ANALYZE');
    return true;
  };

  checkpoint = async (dbAlias: string): Promise<boolean> => {
    const safeAlias = duckValidatorsZod.aliasName.parse(dbAlias);
    await this.#executor.getRowObjectsJS(
      `checkpoint(${safeAlias})`,
      `CHECKPOINT ${safeAlias}`
    );
    return true;
  };

  vacuum = async (): Promise<boolean> => {
    await this.#executor.getRowObjectsJS('vacuum()', 'VACUUM');
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

  #getFs = (): FileSystemUtils => {
    if (this.#fs === undefined) {
      this.#fs = new FileSystemUtils({
        logger: this.#logger,
      });
    }
    return this.#fs;
  };
}

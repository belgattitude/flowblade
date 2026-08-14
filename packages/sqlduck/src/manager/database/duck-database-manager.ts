import { type DuckDBConnection, DuckDBInstanceCache } from '@duckdb/node-api';
import type { Logger } from '@logtape/logtape';
import type * as z from 'zod';

import { FileSystemUtils } from '../../filesystem/file-system-utils.ts';
import { sqlduckDefaultLogtapeLogger } from '../../logger/sqlduck-default-logtape-logger.ts';
import { Database } from '../../objects/database.ts';
import { quoteValue } from '../../utils/quote-value.ts';
import type { DuckConnectionParams } from '../../validation/core/types.ts';
import { duckConnectionParamsZodSchema } from '../../validation/zod/duck-connection-params-zod-schema.ts';
import {
  assertValidAliasName,
  duckValidatorsZod,
} from '../../validation/zod/index.ts';
import type { duckDatabaseManagerZodSchemas } from '../../validation/zod/manager/duck-database-manager-zod-schemas.ts';
import { ManagerQueryExecutor } from '../core/manager-query-executor.ts';
import { DuckDatabaseAttachCommand } from './commands/duck-database-attach-command.ts';
import { getAlreadyAttachedDatabaseFromError } from './utils/get-already-attached-database-from-error.ts';

export type GetDatabaseInfo = z.infer<
  typeof duckDatabaseManagerZodSchemas.getDatabases
>;

type AttachOptions =
  | {
      behaviour: 'OR REPLACE';
      /**
       * Since duckdb 1.5.4, the ATTACH OR REPLACE fails if the database is already attached.
       * If this option is set to true, when an attachOrReplace fails with the already attached
       * message, the database will be detached first with regular detach command an re-tried
       *
       * This option might be deprecated in the future as duckdb will fix the issue upstream
       *
       * @default false
       */
      runDetachIfAttachOrReplaceFailWithAlreadyAttached?: boolean;
    }
  | {
      behaviour: 'IF NOT EXISTS';
    };

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
  attach = async (dbParams: DuckConnectionParams, options?: AttachOptions) => {
    const params = duckConnectionParamsZodSchema.parse(dbParams);
    const rawSql = new DuckDatabaseAttachCommand(params, {
      behaviour: options?.behaviour,
    }).getRawSql();
    const restoreCurrentDb = await this.getCurrentDatabase();
    const tempDbNameHack = 'temp_run_detach_if_attached_hack_db';
    let isTempDbNameHackCreated = false;
    try {
      await this.#executor.getRowObjectsJS(
        [
          `attach(${params.alias}`,
          options === undefined ? null : JSON.stringify(options),
        ]
          .filter(Boolean)
          .join(',') + ')',
        rawSql
      );
    } catch (e) {
      // in duckdb > 1.5.5, the attach or replace of a file database now complains
      // Binder Error: Unique file handle conflict: Cannot attach "duckdb_second_attached_file" - the database file "/home/sebastien/github/flowblade/packages/sqlduck/tests/tmp/duckdb_test_reattachable_file.db" is already attached by database "duckdb_first_attached_file"
      if (
        options?.behaviour === 'OR REPLACE' &&
        options?.runDetachIfAttachOrReplaceFailWithAlreadyAttached === true
      ) {
        const alreadyAttached = getAlreadyAttachedDatabaseFromError(e);
        if (alreadyAttached.isAlreadyAttached === true) {
          if (alreadyAttached.dbAlias === restoreCurrentDb) {
            await this.attachIfNotExists({
              type: 'memory',
              alias: tempDbNameHack,
            });
            await this.use(tempDbNameHack);
            isTempDbNameHackCreated = true;
          }
          await this.detachOrIgnore(alreadyAttached.dbAlias);
          await this.attach(dbParams);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    } finally {
      if (restoreCurrentDb !== null && isTempDbNameHackCreated) {
        await this.use(restoreCurrentDb);
        await this.detachOrIgnore(tempDbNameHack);
      }
    }
    return new Database({ alias: params.alias });
  };

  /**
   * Attach or replace a database to the current connection
   *
   * @example
   * ```typescript
   * const dbManager = new DuckDatabaseManager(conn);
   * const database = dbManager.attachOrReplace({
   *   type: 'memory', // can be 'filesystem'...
   *   alias: 'mydb',
   *   options: { COMPRESS: 'true' },
   * }, {
   *   // as tested on duckdb 1.5.5, the attach or replace might not work
   *   // and complain about already attached database. Set this to true
   *   // to implement a detach / attach if the attachOrReplace fails
   *   runDetachIfAttachOrReplaceFailWithAlreadyAttached?: boolean;
   * });
   *
   * console.log(database.alias); // 'mydb'
   * ```
   */
  attachOrReplace = async (
    dbParams: DuckConnectionParams,
    options?: {
      /**
       * Since duckdb 1.5.4, the ATTACH OR REPLACE fails if the database is already attached.
       * If this option is set to true, when an attachOrReplace fails with the already attached
       * message, the database will be detached first with regular detach command an re-tried
       *
       * This option might be deprecated in the future as duckdb will fix the issue upstream
       *
       * @default false
       */
      runDetachIfAttachOrReplaceFailWithAlreadyAttached?: boolean;
    }
  ) => {
    return this.attach(dbParams, {
      behaviour: 'OR REPLACE',
      runDetachIfAttachOrReplaceFailWithAlreadyAttached:
        options?.runDetachIfAttachOrReplaceFailWithAlreadyAttached,
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

  getDatabaseByName = async (
    dbName: string
  ): Promise<GetDatabaseInfo | null> => {
    assertValidAliasName(dbName);
    const result = await this.#executor.getRowObjectsJS<GetDatabaseInfo>(
      'getDatabaseByName',
      `select database_name,
                     database_oid,
                     path,
                     comment,
                     type,
                     readonly,
                     internal,
                     encrypted
              from duckdb_databases()
              where database_name = '${dbName}'`
    );
    if (result.length === 1) {
      return result[0]!;
    }
    return null;
  };

  getDatabasesByPath = async (
    path: string
  ): Promise<GetDatabaseInfo | null> => {
    const result = await this.#executor.getRowObjectsJS<GetDatabaseInfo>(
      'getDatabaseByPath',
      `select database_name,
                     database_oid,
                     path,
                     comment,
                     type,
                     readonly,
                     internal,
                     encrypted
              from duckdb_databases()
              where path = ${quoteValue(path)}`
    );
    if (result.length === 1) {
      return result[0]!;
    }
    return null;
  };

  /**
   * Return information about attached databases
   */
  getDatabases = async (params?: {
    includeInternal?: boolean;
  }): Promise<GetDatabaseInfo[]> => {
    const { includeInternal = false } = params ?? {};
    const internalFilter = includeInternal ? '1=1' : 'internal = false';
    return this.#executor.getRowObjectsJS<GetDatabaseInfo>(
      'getDatabases',
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

  getCurrentDatabase = async (): Promise<string | null> => {
    const result = await this.#executor.getRowObjectsJS<{
      current_database: string | null;
    }>('getCurrentDatabase()', 'SELECT current_database() as current_database');
    return result[0]?.current_database ?? null;
  };

  getCurrentSchema = async (): Promise<string | null> => {
    const result = await this.#executor.getRowObjectsJS<{
      current_schema: string | null;
    }>('getCurrentSchema()', 'SELECT current_schema() as current_schema');
    return result?.[0]?.current_schema ?? null;
  };

  getCurrentCatalog = async (): Promise<string | null> => {
    const result = await this.#executor.getRowObjectsJS<{
      current_catalog: string | null;
    }>('getCurrentCatalog()', 'SELECT current_catalog() as current_catalog');
    return result?.[0]?.current_catalog ?? null;
  };

  /**
   * Set the default database to use
   * @throws if the database alias does not exist
   */
  use = async (dbAlias: string): Promise<true> => {
    const safeAlias = duckValidatorsZod.aliasName.parse(dbAlias);
    const result = await this.#executor.getRowObjectsJS(
      `use(${safeAlias})`,
      `USE ${safeAlias}`
    );
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

import * as fs from 'node:fs';
import path from 'node:path';

import type { DuckDBConnection } from '@duckdb/node-api';
import { sortBy } from 'es-toolkit';
import { afterEach, beforeEach, describe } from 'vitest';

import { createDuckdbTestMemoryDb } from '@/tests/utils/create-duckdb-test-memory-db.ts';
import { testTempDir } from '@/tests/utils/get-test-temp-dir.ts';

import { FileSystemUtils } from '../../filesystem/file-system-utils.ts';
import { Database } from '../../objects/database.ts';
import { DuckDatabaseManager } from './duck-database-manager.ts';

describe('DuckDatabaseManagerTest', async () => {
  let conn: DuckDBConnection;
  beforeEach(async () => {
    conn = await createDuckdbTestMemoryDb({
      max_memory: '5M',
      threads: 1,
    });
  });
  afterEach(() => {
    conn.closeSync();
  });
  describe('attach', () => {
    it('should attach a memory database', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attach({
        type: 'memory',
        alias: 'memory_db',
        options: {
          accessMode: 'READ_WRITE',
          compress: true,
        },
      });
      expect(database).toBeInstanceOf(Database);
      expect(database.alias).toStrictEqual('memory_db');
    });

    it('should attach a file database', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, 'duckdb_test_file.db');
      const database = await dbManager.attach({
        type: 'filesystem',
        alias: 'duckdb_test_file',
        path: dbFile,
        options: {
          accessMode: 'READ_WRITE',
        },
      });
      expect(database).toBeInstanceOf(Database);
      expect(database.alias).toStrictEqual('duckdb_test_file');
      expect(fs.existsSync(dbFile)).toBeTruthy();
      await dbManager.detach(database.alias);
    });
  });
  describe('showDatabases', () => {
    it('should list all databases', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({
        type: 'memory',
        alias: 'test_show_database_db',
      });
      const databases = await dbManager.showDatabases();
      expect(sortBy(databases, ['database_name'])).toStrictEqual([
        {
          database_name: 'memory',
        },
        { database_name: 'test_show_database_db' },
      ]);
    });
  });
  describe('detach', () => {
    it('should detach a valid database', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({ type: 'memory', alias: 'db1' });
      await dbManager.attach({ type: 'memory', alias: 'db2' });
      await dbManager.detach('db2');
      const databases = await dbManager.showDatabases();
      expect(sortBy(databases, ['database_name'])).toStrictEqual([
        { database_name: 'db1' },
        { database_name: 'memory' },
      ]);
    });
  });
  describe('createDatabaseFile', () => {
    it('should create a database file', async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, 'test-createDatabaseFile.db');
      const fsUtils = new FileSystemUtils();
      fsUtils.removeFileIfExists(dbFile);

      const result = await dbManager.createDatabaseFile({
        path: dbFile,
      });
      fsUtils.removeFileIfExists(dbFile);

      expect(result).toStrictEqual({
        status: 'created',
      });
    });
  });
});

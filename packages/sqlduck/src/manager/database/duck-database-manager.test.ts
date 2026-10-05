import * as fs from "node:fs";
import path from "node:path";

import type { DuckDBConnection } from "@duckdb/node-api";
import { sortBy } from "es-toolkit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";

import { FileSystemUtils } from "../../filesystem/file-system-utils.ts";
import { Database } from "../../objects/database.ts";
import { duckDatabaseManagerZodSchemas } from "../../validation/zod/manager/duck-database-manager-zod-schemas.ts";
import { DuckDatabaseManager } from "./duck-database-manager.ts";

describe("DuckDatabaseManagerTest", async () => {
  let conn: DuckDBConnection;
  beforeEach(async () => {
    conn = await createDuckdbTestMemoryDb({
      max_memory: "5M",
      threads: 1,
    });
  });
  afterEach(() => {
    conn.closeSync();
  });
  describe("attach", () => {
    it("should attach a memory database", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.attach({
        type: "memory",
        alias: "memory_db",
        options: {
          accessMode: "READ_WRITE",
          compress: true,
        },
      });
      expect(database).toBeInstanceOf(Database);
      expect(database.alias).toBe("memory_db");
    });

    it("should attach a file database", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, "duckdb_test_file.db");
      const database = await dbManager.attach({
        type: "filesystem",
        alias: "duckdb_test_file",
        path: dbFile,
        options: {
          accessMode: "READ_WRITE",
        },
      });
      expect(database).toBeInstanceOf(Database);
      expect(database.alias).toBe("duckdb_test_file");
      expect(fs.existsSync(dbFile)).toBeTruthy();
      await dbManager.detach(database.alias);
    });

    it("should attach or re-attach a file database", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, "duckdb_test_reattachable_file.db");
      const database = await dbManager.attachOrReplace({
        type: "filesystem",
        alias: "duckdb_first_attached_file",
        path: dbFile,
        options: {
          accessMode: "READ_WRITE",
        },
      });
      expect(database).toBeInstanceOf(Database);
      expect(database.alias).toBe("duckdb_first_attached_file");
      expect(fs.existsSync(dbFile)).toBeTruthy();

      // re-attach
      const database2 = await dbManager.attachOrReplace(
        {
          type: "filesystem",
          alias: "duckdb_second_attached_file",
          path: dbFile,
          options: {
            accessMode: "READ_ONLY",
          },
        },
        {
          runDetachIfAttachOrReplaceFailWithAlreadyAttached: true,
        }
      );
      expect(database2).toBeInstanceOf(Database);
      expect(database2.alias).toBe("duckdb_second_attached_file");
      expect(fs.existsSync(dbFile)).toBeTruthy();

      await dbManager.detachOrIgnore(database.alias);
      await dbManager.detach(database2.alias);
    });
  });
  describe("showDatabases", () => {
    it("should list all databases", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({
        type: "memory",
        alias: "test_show_database_db",
      });
      const databases = await dbManager.showDatabases();
      expect(sortBy(databases, ["database_name"])).toStrictEqual([
        {
          database_name: "memory",
        },
        { database_name: "test_show_database_db" },
      ]);
    });
  });
  describe("isAttached", () => {
    it("should return true when attached", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({ type: "memory", alias: "test_is_attached" });
      await expect(dbManager.isAttached("test_is_attached")).resolves.toBe(
        true
      );
    });

    it("should return false when not attached", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await expect(dbManager.isAttached("test_is_not_attached")).resolves.toBe(
        false
      );
    });
  });
  describe("getDuckdbDatabases", () => {
    it("should return information about attached databases", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const databases = await dbManager.getDatabases();
      expect(databases?.[0]).toStrictEqual(
        expect.schemaMatching(duckDatabaseManagerZodSchemas.getDatabases)
      );
    });
  });
  describe("getDuckdbDatabaseByName", () => {
    it("should return information about attached databases", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const database = await dbManager.getDatabaseByName("memory");
      expect(database?.database_name).toBe("memory");
      expect(database).toStrictEqual(
        expect.schemaMatching(duckDatabaseManagerZodSchemas.getDatabases)
      );
    });
  });
  describe("getDuckdbDatabaseByPath", () => {
    it("should return information about attached databases", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, "test-getDuckdbDatabaseByPath.db");
      await dbManager.attachIfNotExists({
        type: "filesystem",
        path: dbFile,
        alias: "getDuckdbDatabaseByPath",
        options: {
          accessMode: "READ_WRITE",
          recoveryMode: "no_wal_writes",
        },
      });
      const database = await dbManager.getDatabasesByPath(dbFile);
      expect(database?.database_name).toBe("getDuckdbDatabaseByPath");
      expect(database?.path).toStrictEqual(dbFile);
      expect(database).toStrictEqual(
        expect.schemaMatching(duckDatabaseManagerZodSchemas.getDatabases)
      );
    });
  });

  describe("detach", () => {
    it("should detach a valid database", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({ type: "memory", alias: "db1" });
      await dbManager.attach({ type: "memory", alias: "db2" });
      await dbManager.detach("db2");
      const databases = await dbManager.showDatabases();
      expect(sortBy(databases, ["database_name"])).toStrictEqual([
        { database_name: "db1" },
        { database_name: "memory" },
      ]);
    });

    it("should throw when a database is not attached", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await expect(dbManager.detach("unattached_db")).rejects.toThrow(
        /Failed to detach database with name "unattached_db"/
      );
    });
  });
  describe("detachOrIgnore", () => {
    it("should detach a valid database", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attach({ type: "memory", alias: "db2" });
      const result = await dbManager.detachOrIgnore("db2");
      expect(result).toBe(true);
      const databases = await dbManager.showDatabases();
      expect(sortBy(databases, ["database_name"])).toStrictEqual([
        { database_name: "memory" },
      ]);
    });

    it("should not throw when a database is not attached", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const result = await dbManager.detachOrIgnore("unattached_db");
      expect(result).toBe(false);
    });
  });

  describe("createDatabaseFile", () => {
    it("should create a database file", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      const dbFile = path.join(testTempDir, "test-createDatabaseFile.db");
      const fsUtils = new FileSystemUtils();
      fsUtils.removeFileIfExists(dbFile);

      const result = await dbManager.createDatabaseFile({
        path: dbFile,
      });
      fsUtils.removeFileIfExists(dbFile);

      expect(result).toStrictEqual({
        status: "created",
      });
    });
  });

  describe("getCurrentCatalog", async () => {
    it("should return the current catalog when currently in use", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attachOrReplace({
        type: "memory",
        alias: "test222",
      });
      await dbManager.use("test222");
      const currCatalog = await dbManager.getCurrentCatalog();
      expect(currCatalog).toBe("test222");
    });
  });
  describe("getCurrentDatabase", async () => {
    it("should return the current database when currently in use", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attachOrReplace({
        type: "memory",
        alias: "test444",
      });
      await dbManager.use("test444");
      const currDb = await dbManager.getCurrentDatabase();
      expect(currDb).toBe("test444");
    });
  });
  describe("getCurrentSchema", async () => {
    it("should return the schema", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attachOrReplace({
        type: "memory",
        alias: "test555",
      });
      await dbManager.use("test555");
      const currSchema = await dbManager.getCurrentSchema();
      expect(currSchema).toBe("main");
    });
  });

  describe("use", async () => {
    it("should return true if it succeed", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await dbManager.attachOrReplace({
        type: "memory",
        alias: "test777",
      });
      const result = await dbManager.use("test777");
      expect(result).toBe(true);
      const currDb = await dbManager.getCurrentDatabase();
      expect(currDb).toBe("test777");
    });

    it("should throw on non exitant alias", async () => {
      const dbManager = new DuckDatabaseManager(conn);
      await expect(dbManager.use("not_existant_db_alias")).rejects.toThrow(
        'Failed to run "DuckDatabaseManager.use(not_existant_db_alias)" - Catalog Error: SET schema: No catalog + schema named "not_existant_db_alias" found'
      );
    });
  });
});

/**
 * Compare the DuckTableLoader recommendations of docs/loader.md
 * ("Tuning by storage profile") with the defaults and with common mistakes,
 * for each storage profile: memory, local disk and slow disk.
 *
 * The slow disk profile needs a directory on a slow storage (ie: an NFS
 * mount), it is skipped otherwise:
 *
 * ```bash
 * SQLDUCK_BENCH_SLOW_DISK_DIR=/mnt/nfs/tmp pnpm bench bench/loader-profiles.bench.ts
 * ```
 */
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { DuckDBInstance } from "@duckdb/node-api";
import type { DuckDBConnection } from "@duckdb/node-api";
import isInCi from "is-in-ci";
import { type BenchCompareOptions, test } from "vitest";
import * as z from "zod";

import { testTempDir } from "#tests/utils/get-test-temp-dir.ts";

import { ChunkAppenderStrategy, DuckTableLoader } from "../src/loader/index.ts";
import type { LoadParams } from "../src/loader/index.ts";
import { DuckDatabaseManager } from "../src/manager/database/duck-database-manager.ts";
import { DuckSettingsManager } from "../src/manager/settings/duck-settings-manager.ts";
import type { DuckSessionSettings } from "../src/manager/settings/duck-settings.types.ts";
import { Table } from "../src/objects/table.ts";
import { zodCodecs } from "../src/utils/zod-codecs.ts";

// Bench functions must be declared `async`: tinybench calls a non-async
// function once when it is registered (without awaiting it) to detect
// whether it returns a promise, which would start an extra load.
const benchConfig: BenchCompareOptions = {
  iterations: isInCi ? 1 : 5,
  warmupIterations: 1,
  throws: true,
};

// Above a row group (122_880 rows), so that optimistic writes and the
// appender auto-flush (204_800 rows) happen like in real loads
const limit = isInCi ? 10_000 : 1_000_000;

const slowDiskDir = process.env.SQLDUCK_BENCH_SLOW_DISK_DIR;

const schema = z.object({
  id: z.int32(),
  name: z.string(),
  email: z.string().nullable(),
  bignumber: z.nullable(zodCodecs.bigintToString),
  created_at: z.string().meta({ duckdbType: "TIMESTAMP" }),
});

const createdAt = "2025-12-16T00:00:00.000Z";

async function* getRows() {
  for (let id = 0; id < limit; id++) {
    yield {
      id,
      name: `name-${id % 20}`,
      email: id % 3 === 0 ? null : `user-${id % 20}@example.com`,
      bignumber: BigInt(id),
      created_at: createdAt,
    };
  }
}

type Variant = {
  conn: DuckDBConnection;
  table: Table;
  /** @default new ChunkAppenderStrategy() */
  strategy?: ChunkAppenderStrategy;
  sessionSettings?: DuckSessionSettings;
  checkpoint?: LoadParams<typeof schema>["checkpoint"];
};

const load = async (variant: Variant): Promise<void> => {
  const { conn, table, strategy, sessionSettings = {}, checkpoint } = variant;
  const { totalRows } = await new DuckSettingsManager(conn).withSessionSettings(
    sessionSettings,
    () =>
      new DuckTableLoader({ conn, strategy }).load({
        table,
        schema,
        rows: getRows(),
        mode: "createOrReplace",
        checkpoint,
      })
  );
  if (totalRows !== limit) {
    throw new Error(`Expected ${limit} rows, got ${totalRows} rows`);
  }
};

/**
 * Open an instance, `globalSettings` are instance settings (ie:
 * `wal_autocheckpoint`) that can't be changed for a single load.
 */
const openInstance = async (
  onTestFinished: (fn: () => void) => void,
  globalSettings: Record<string, string> = {}
) => {
  const instance = await DuckDBInstance.create(":memory:", {
    threads: isInCi ? "1" : "4",
    max_memory: isInCi ? "256MB" : "2GB",
    temp_directory: path.join(testTempDir, "duckdb-temp"),
    ...globalSettings,
  });
  const conn = await instance.connect();
  onTestFinished(() => {
    conn.closeSync();
    instance.closeSync();
  });
  return conn;
};

/**
 * Attach a fresh database file `<dir>/<name>.db`, return a table in it.
 */
const attachFileTable = async (
  conn: DuckDBConnection,
  dir: string,
  name: string
): Promise<Table> => {
  await mkdir(dir, { recursive: true });
  const dbPath = path.join(dir, `bench-loader-${name}.db`);
  await rm(dbPath, { force: true });
  await rm(`${dbPath}.wal`, { force: true });
  await new DuckDatabaseManager(conn).attachOrReplace({
    type: "filesystem",
    alias: name,
    path: dbPath,
    options: { accessMode: "READ_WRITE" },
  });
  return new Table({ name: "bench", database: name });
};

test(`loader profile: memory (count: ${limit})`, async ({
  bench,
  onTestFinished,
}) => {
  const conn = await openInstance(onTestFinished);
  const table = new Table("bench_memory");

  await bench.compare(
    bench("memory: defaults", async () => {
      await load({ conn, table });
    }),
    bench("memory: recommended (optimistic write off, no checkpoint)", async () => {
      await load({
        conn,
        table,
        sessionSettings: { enable_optimistic_write: false },
        checkpoint: { onComplete: false },
      });
    }),
    benchConfig
  );
});

test(`loader profile: local disk (count: ${limit})`, async ({
  bench,
  onTestFinished,
}) => {
  const conn = await openInstance(onTestFinished);
  const dir = path.join(testTempDir, "bench-loader-profiles");
  const tables = {
    defaults: await attachFileTable(conn, dir, "disk_defaults"),
    smallFlushes: await attachFileTable(conn, dir, "disk_small_flushes"),
    periodicCheckpoint: await attachFileTable(conn, dir, "disk_checkpoints"),
    noOptimisticWrite: await attachFileTable(conn, dir, "disk_no_optimistic"),
  };

  await bench.compare(
    bench("disk: defaults (recommended)", async () => {
      await load({ conn, table: tables.defaults });
    }),
    bench("disk: small flushes (flushEveryRows 20_480, WAL path)", async () => {
      await load({
        conn,
        table: tables.smallFlushes,
        strategy: new ChunkAppenderStrategy({ flushEveryRows: 20_480 }),
      });
    }),
    bench("disk: periodic checkpoint (everyRows 204_800)", async () => {
      await load({
        conn,
        table: tables.periodicCheckpoint,
        checkpoint: { everyRows: 204_800 },
      });
    }),
    bench("disk: optimistic write off", async () => {
      await load({
        conn,
        table: tables.noOptimisticWrite,
        sessionSettings: { enable_optimistic_write: false },
      });
    }),
    benchConfig
  );
});

test.skipIf(slowDiskDir === undefined)(
  `loader profile: slow disk (count: ${limit}, dir: ${slowDiskDir ?? "unset"})`,
  async ({ bench, onTestFinished }) => {
    const dir = slowDiskDir ?? "";
    const conn = await openInstance(onTestFinished);
    // wal_autocheckpoint is an instance setting
    const tunedConn = await openInstance(onTestFinished, {
      wal_autocheckpoint: "1GB",
    });
    const localDir = path.join(testTempDir, "bench-loader-profiles");
    const tables = {
      defaults: await attachFileTable(conn, dir, "slow_defaults"),
      smallFlushes: await attachFileTable(conn, dir, "slow_small_flushes"),
      tuned: await attachFileTable(tunedConn, dir, "slow_tuned"),
    };

    await bench.compare(
      bench("slow disk: defaults", async () => {
        await load({ conn, table: tables.defaults });
      }),
      bench("slow disk: small flushes (flushEveryRows 20_480)", async () => {
        await load({
          conn,
          table: tables.smallFlushes,
          strategy: new ChunkAppenderStrategy({ flushEveryRows: 20_480 }),
        });
      }),
      bench("slow disk: recommended (wal_autocheckpoint 1GB, write_buffer_row_group_count 10)", async () => {
        await load({
          conn: tunedConn,
          table: tables.tuned,
          sessionSettings: { write_buffer_row_group_count: 10 },
        });
      }),
      bench("slow disk: build on local disk, then copy the file", async () => {
        const table = await attachFileTable(conn, localDir, "slow_local_copy");
        await load({ conn, table });
        await new DuckDatabaseManager(conn).detach("slow_local_copy");
        await copyFile(
          path.join(localDir, "bench-loader-slow_local_copy.db"),
          path.join(dir, "bench-loader-slow_local_copy.db")
        );
      }),
      benchConfig
    );
  }
);

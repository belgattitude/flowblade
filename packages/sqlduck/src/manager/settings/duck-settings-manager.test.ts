import type { DuckDBConnection } from "@duckdb/node-api";
import { describe, expect } from "vitest";

import { openDuckdbTestMemoryDb } from "#tests/utils/create-duckdb-test-memory-db.ts";
import { createDuckTestIsolated } from "#tests/utils/duck-test.ts";

import { DuckSettingsManager } from "./duck-settings-manager.ts";

const it = createDuckTestIsolated({
  max_memory: "5M",
  threads: 1,
});

describe("DuckSettingsManagerTest", () => {
  describe("getCurrentSettings", () => {
    it("should return the requested settings", async ({ conn }) => {
      const settingsManager = new DuckSettingsManager(conn);
      const currentSettings = await settingsManager.getCurrentSettings([
        "threads",
        "temp_directory",
      ]);
      expect(currentSettings).toStrictEqual({
        threads: "1",
        temp_directory: expect.stringMatching(/.+/),
      });
    });

    it("should not run sql injected in a setting name", async ({ conn }) => {
      const settingsManager = new DuckSettingsManager(conn);
      // Escaped: read as an (unknown) setting name, not as sql
      await expect(
        settingsManager.getCurrentSettings(["threads') as x; SELECT ('1"])
      ).rejects.toThrow(/unrecognized configuration parameter/i);
    });
  });

  describe("withSessionSettings", () => {
    const get = async (conn: DuckDBConnection, name: string) => {
      const reader = await conn.runAndReadAll(
        `SELECT current_setting('${name}')::VARCHAR AS value`
      );
      return reader.getRowObjects()[0]?.value;
    };

    // Two connections of the same instance
    const openTwoConnections = async (
      onTestFinished: (fn: () => void) => void
    ) => {
      const db = await openDuckdbTestMemoryDb({ threads: 1 });
      const other = await db.instance.connect();
      onTestFinished(() => {
        other.closeSync();
        db.close();
      });
      return { conn: db.conn, other };
    };

    it("should apply the settings to the connection only, then restore them", async ({
      onTestFinished,
    }) => {
      const { conn, other } = await openTwoConnections(onTestFinished);
      const result = await new DuckSettingsManager(conn).withSessionSettings(
        {
          preserve_insertion_order: false,
          enable_optimistic_write: false,
          write_buffer_row_group_count: 7,
        },
        async () => {
          await expect(get(conn, "preserve_insertion_order")).resolves.toBe(
            "false"
          );
          await expect(get(conn, "enable_optimistic_write")).resolves.toBe(
            "false"
          );
          await expect(get(conn, "write_buffer_row_group_count")).resolves.toBe(
            "7"
          );
          // Other connections are not affected
          await expect(get(other, "preserve_insertion_order")).resolves.toBe(
            "true"
          );
          await expect(
            get(other, "write_buffer_row_group_count")
          ).resolves.toBe("5");
          return "result";
        }
      );
      expect(result).toBe("result");
      await expect(get(conn, "preserve_insertion_order")).resolves.toBe("true");
      await expect(get(conn, "enable_optimistic_write")).resolves.toBe("true");
      await expect(get(conn, "write_buffer_row_group_count")).resolves.toBe(
        "5"
      );
    });

    it("should restore the settings when fn throws", async ({
      onTestFinished,
    }) => {
      const { conn } = await openTwoConnections(onTestFinished);
      await expect(
        new DuckSettingsManager(conn).withSessionSettings(
          { preserve_insertion_order: false },
          () => {
            throw new Error("fn failure");
          }
        )
      ).rejects.toThrow("fn failure");
      await expect(get(conn, "preserve_insertion_order")).resolves.toBe("true");
    });

    it("should reject a global setting before running fn, and reset the applied ones", async ({
      onTestFinished,
    }) => {
      const { conn } = await openTwoConnections(onTestFinished);
      let called = false;
      await expect(
        new DuckSettingsManager(conn).withSessionSettings(
          {
            preserve_insertion_order: false,
            // @ts-expect-error global setting
            threads: 2,
          },
          () => {
            called = true;
          }
        )
      ).rejects.toThrow(/^Failed to set session setting 'threads' - /);
      expect(called).toBe(false);
      await expect(get(conn, "preserve_insertion_order")).resolves.toBe("true");
      await expect(get(conn, "threads")).resolves.toBe("1");
    });

    it("should restore the enclosing values of nested calls", async ({
      onTestFinished,
    }) => {
      const { conn } = await openTwoConnections(onTestFinished);
      const manager = new DuckSettingsManager(conn);
      await manager.withSessionSettings(
        { write_buffer_row_group_count: 7 },
        async () => {
          await manager.withSessionSettings(
            {
              write_buffer_row_group_count: 9,
              preserve_insertion_order: false,
            },
            async () => {
              await expect(
                get(conn, "write_buffer_row_group_count")
              ).resolves.toBe("9");
            }
          );
          await expect(get(conn, "write_buffer_row_group_count")).resolves.toBe(
            "7"
          );
          await expect(get(conn, "preserve_insertion_order")).resolves.toBe(
            "true"
          );
        }
      );
      await expect(get(conn, "write_buffer_row_group_count")).resolves.toBe(
        "5"
      );
    });

    it("should reject concurrent calls on the same connection", async ({
      onTestFinished,
    }) => {
      const { conn, other } = await openTwoConnections(onTestFinished);
      const manager = new DuckSettingsManager(conn);
      const { promise: blocked, resolve: release } =
        Promise.withResolvers<undefined>();
      const first = manager.withSessionSettings(
        { preserve_insertion_order: false },
        () => blocked
      );
      await expect(
        manager.withSessionSettings({ enable_optimistic_write: false }, () => 1)
      ).rejects.toThrow(/already running on this connection/);
      // Another connection is fine
      await expect(
        new DuckSettingsManager(other).withSessionSettings(
          { enable_optimistic_write: false },
          () => 1
        )
      ).resolves.toBe(1);
      release(undefined);
      await first;
      // Sequential calls are fine once the first one is done
      await expect(
        manager.withSessionSettings({ enable_optimistic_write: false }, () => 2)
      ).resolves.toBe(2);
      await expect(get(conn, "preserve_insertion_order")).resolves.toBe("true");
    });

    it("should not run sql injected in a setting value", async ({
      onTestFinished,
    }) => {
      const { conn } = await openTwoConnections(onTestFinished);
      await expect(
        new DuckSettingsManager(conn).withSessionSettings(
          { default_order: "asc'; DROP TABLE x; --" },
          () => 1
        )
      ).rejects.toThrow(/Failed to set session setting 'default_order'/);
    });
  });
});

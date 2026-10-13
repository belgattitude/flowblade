import { describe, expect } from "vitest";

import { createDuckTestIsolated } from "#tests/utils/duck-test.ts";

import { DuckExtensionsManager } from "./duck-extensions-manager.ts";

const it = createDuckTestIsolated({
  max_memory: "5M",
  threads: 1,
});

describe("DuckExtensionsManagerTest", () => {
  describe("search", () => {
    it("should return installed extension", async ({ conn }) => {
      const extManager = new DuckExtensionsManager(conn);
      const extensions = await extManager.search({
        installed: true,
        name: "core_functions",
      });
      expect(extensions).toStrictEqual([
        {
          description: expect.stringMatching(/.+/),
          extension_name: "core_functions",
          installed: true,
        },
      ]);
    });
  });

  describe("sql injection", () => {
    it("should reject an invalid extension name before running it", async ({
      conn,
    }) => {
      const extManager = new DuckExtensionsManager(conn);
      await expect(extManager.install("fts; DROP TABLE users")).rejects.toThrow(
        "Invalid extension name 'fts; DROP TABLE users'"
      );
    });

    it("should escape the searched name", async ({ conn }) => {
      const extManager = new DuckExtensionsManager(conn);
      await expect(
        extManager.search({ name: "x' OR '1'='1" })
      ).resolves.toStrictEqual([]);
    });
  });

  // Installing extensions downloads them from the duckdb extensions repository
  describe("install", { tags: ["network"], timeout: 15_000 }, () => {
    it("should force install an extension", async ({ conn }) => {
      const extManager = new DuckExtensionsManager(conn);
      const installed = await extManager.install("fts", {
        force: true,
      });
      expect(installed).toBe(true);
    });

    it("should install an extension", async ({ conn }) => {
      const extManager = new DuckExtensionsManager(conn);
      const installed = await extManager.install("fts");
      expect(installed).toBe(true);
    });

    it("should fail on invalid extension", async ({ conn }) => {
      const extManager = new DuckExtensionsManager(conn);
      await expect(
        extManager.install("not_existing_extension")
      ).rejects.toThrow('Failed to run "DuckExtensionsManager.install"');
    });
  });
});

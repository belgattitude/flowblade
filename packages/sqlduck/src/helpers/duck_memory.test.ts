import isInCi from "is-in-ci";
import { describe, expect } from "vitest";

import { createDuckTest } from "#tests/utils/duck-test.ts";

import { DuckMemory, duckMemoryTags } from "./duck-memory.ts";

const testTimeout = 10_000;

// Keep max_memory high to prevent going to .tmp directory
const it = createDuckTest({
  max_memory: isInCi ? "128M" : "256M",
  threads: 1,
});

describe("DuckMemory tests", () => {
  describe("getAll", () => {
    it(
      "Should return info for all tags",
      { timeout: testTimeout },
      async ({ conn }) => {
        const duckMem = new DuckMemory(conn);
        const rows = await duckMem.getAll();
        expect(rows).toHaveLength(duckMemoryTags.length);
        expect(rows[0]).toMatchObject({
          tag: expect.any(String),
          memory_usage_bytes: 0n,
          temporary_storage_bytes: 0n,
        });
      }
    );

    it(
      "Should respect order by",
      { timeout: testTimeout },
      async ({ conn }) => {
        const duckMem = new DuckMemory(conn);
        const rows = await duckMem.getAll({
          orderBy: "tag_desc",
        });
        expect(rows?.[0]?.tag).toBe("WINDOW");
      }
    );
  });

  describe("getByTag", () => {
    it.for(duckMemoryTags)(
      "Should return infos for tag %s",
      { timeout: testTimeout },
      async (tag, { conn }) => {
        const duckMem = new DuckMemory(conn);
        const mem = await duckMem.getByTag(tag);
        expect(mem).toMatchObject({
          tag,
          memory_usage_bytes: 0n,
          temporary_storage_bytes: 0n,
        });
      }
    );
  });

  describe("getSummary", () => {
    it(
      "Should return summary info",
      { timeout: testTimeout },
      async ({ conn }) => {
        const duckMem = new DuckMemory(conn);
        const summary = await duckMem.getSummary();
        expect(summary).toStrictEqual({
          totalMB: 0,
          totalTempMB: 0,
        });
      }
    );
  });
});

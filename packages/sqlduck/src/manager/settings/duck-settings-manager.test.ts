import { describe, expect } from "vitest";

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
  });
});

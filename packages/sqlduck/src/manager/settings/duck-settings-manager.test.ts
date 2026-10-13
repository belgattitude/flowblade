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

    it("should not run sql injected in a setting name", async ({ conn }) => {
      const settingsManager = new DuckSettingsManager(conn);
      // Escaped: read as an (unknown) setting name, not as sql
      await expect(
        settingsManager.getCurrentSettings(["threads') as x; SELECT ('1"])
      ).rejects.toThrow(/unrecognized configuration parameter/i);
    });
  });
});

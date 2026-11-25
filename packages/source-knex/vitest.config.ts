import { defineConfig, mergeConfig } from "@flowblade/dx/vitest";

import { sharedConfig } from "./vitest.shared.ts";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      include: ["./src/**/*.test.{js,ts}"],
      coverage: {
        // Fails if total coverage is under the thresholds
        thresholds: {
          lines: 40,
          statements: 40,
          functions: 40,
          branches: 30,
        },
      },
    },
  })
);

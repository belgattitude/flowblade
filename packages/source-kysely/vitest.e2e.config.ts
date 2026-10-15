import { defineConfig, mergeConfig } from "@flowblade/dx/vitest";

import { sharedConfig } from "./vitest.shared.ts";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      // Inline projects inherit the options above
      projects: [
        {
          test: {
            name: "e2e-mssql",
            include: ["./tests/e2e/mssql/**/*.test.ts"],
            // Starts one container shared by all mssql test files
            globalSetup: ["./tests/e2e/mssql/global-setup.ts"],
            testTimeout: 10_000,
            benchmark: {
              include: ["./bench/e2e/**/*.bench.ts"],
            },
          },
        },
      ],
    },
  })
);

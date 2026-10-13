import { defineConfig, mergeConfig } from "vitest/config";

import { sharedConfig } from "./vitest.shared.ts";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      typecheck: {
        enabled: false,
      },
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "clover"],
        include: ["src/**/*.{js,jsx,ts,tsx}"],
      },
      // Inline projects inherit the options above
      projects: [
        {
          test: {
            name: "e2e",
            include: ["./tests/e2e/**/*.test.{js,jsx,ts,tsx}"],
            exclude: ["./tests/e2e/mssql/**"],
          },
        },
        {
          test: {
            name: "e2e-mssql",
            include: ["./tests/e2e/mssql/**/*.test.{js,jsx,ts,tsx}"],
            // Starts one container shared by all mssql test files
            globalSetup: ["./tests/e2e/mssql/global-setup.ts"],
            testTimeout: 10_000,
          },
        },
      ],
    },
  })
);

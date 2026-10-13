import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig, mergeConfig } from "vitest/config";

import { sharedConfig } from "./vitest.shared.ts";

const isCodeSpeedEnabled = process.env?.CODSPEED === "1";
const cspeed = isCodeSpeedEnabled ? codspeedPlugin() : undefined;

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [cspeed].filter(Boolean),
    test: {
      include: ["./src/**/*.test.{js,ts}"],
      benchmark: {
        include: ["./bench/**/*.bench.ts"],
        // Requires a database, see vitest.e2e.config.ts
        exclude: ["./bench/e2e/**"],
      },
      coverage: {
        include: ["src/**/*.{js,jsx,ts,tsx}"],
        provider: "v8",
        reporter: ["text"],
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

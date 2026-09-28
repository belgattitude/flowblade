import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

const testFiles = ["./src/**/*.test.{js,ts}", "./test/**/*.test.{js,ts}"];

const isCodeSpeedEnabled = process.env?.CODSPEED === "1";
const cspeed = isCodeSpeedEnabled ? codspeedPlugin() : undefined;

export default defineConfig({
  plugins: [cspeed].filter(Boolean),
  resolve: {
    conditions: ["flowblade-monorepo-source"],
  },
  ssr: {
    resolve: {
      conditions: ["flowblade-monorepo-source", "import", "default"],
    },
  },
  cacheDir: "../../.cache/vite/sql-tag",
  test: {
    pool: "vmThreads",
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "v8",
      reporter: ["text"],
      thresholds: {
        lines: 55, // Fails if total line coverage is under 80%
        statements: 55, // Fails if total statement coverage is under 80%
        functions: 55, // Fails if total function coverage is under 85%
        branches: 50, // Fails if total branch coverage is under 75%
      },
    },
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "dist/**",
      "**/coverage/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
    globals: true,
    include: testFiles,
  },
});

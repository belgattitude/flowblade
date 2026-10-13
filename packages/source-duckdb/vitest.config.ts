import codspeedPlugin from "@codspeed/vitest-plugin";
import { defineConfig } from "vitest/config";

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
  cacheDir: "../../.cache/vite/source-duckdb",
  test: {
    // Tests run on in-memory DuckDB databases, no external service required
    include: ["./src/**/*.test.ts"],
    benchmark: {
      include: ["./bench/**/*.bench.ts"],
    },
    // Default all tests to UTC
    globalSetup: "./vitest.setup.ts",
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "v8",
      reporter: ["text", "clover"],
    },
  },
});

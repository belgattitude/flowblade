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
  cacheDir: "../../.cache/vite/sql-tag-format",
  test: {
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "istanbul",
      reporter: ["text", "json", "clover"],
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

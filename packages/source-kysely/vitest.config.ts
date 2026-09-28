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
  cacheDir: "../../.cache/vite/source-kysely",
  test: {
    /**
     * Module node_modules/.pnpm/@azure+identity@4.13.3_supports-color@7.2.0/node_modules/@azure/identity/dist/esm/index.js:3
     * seems to be an ES Module but shipped in a CommonJS package.
     * You might want to create an issue to the package "@azure/identity" asking them to ship the file in .mjs
     * extension or add "type": "module" in their package.json.
     */
    server: {
      deps: {
        inline: ["@azure/identity"],
      },
    },
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "v8",
      reporter: ["text"],
      thresholds: {
        lines: 40, // Fails if total line coverage is under 80%
        statements: 40, // Fails if total statement coverage is under 80%
        functions: 40, // Fails if total function coverage is under 85%
        branches: 30, // Fails if total branch coverage is under 75%
      },
    },
    setupFiles: "./tests/vitest.setup.ts",
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

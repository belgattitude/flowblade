import { defineConfig } from "vitest/config";

const testFiles = [
  "./src/**/*.test.{js,jsx,ts,tsx}",
  "./tests/utils/**/*.test.{js,jsx,ts,tsx}",
];
export default defineConfig({
  resolve: {
    conditions: ["flowblade-monorepo-source"],
  },
  ssr: {
    resolve: {
      conditions: ["flowblade-monorepo-source", "import", "default"],
    },
  },
  test: {
    globals: true,
    typecheck: {
      enabled: true,
    },
    setupFiles: "./tests/vitest.setup.ts",
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "v8",
      reporter: ["text"],
      thresholds: {
        lines: 80, // Fails if total line coverage is under 80%
        statements: 80, // Fails if total statement coverage is under 80%
        functions: 80, // Fails if total function coverage is under 85%
        branches: 70, // Fails if total branch coverage is under 75%
      },
    },
    include: testFiles,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});

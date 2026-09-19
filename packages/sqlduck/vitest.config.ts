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
      provider: "v8",
      reporter: ["text", "clover"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
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

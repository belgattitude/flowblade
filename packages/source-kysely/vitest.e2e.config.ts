import { defineConfig } from "vitest/config";

const testFiles = ["./tests/e2e/**/*.test.ts"];

export default defineConfig({
  resolve: {
    conditions: ["flowblade-monorepo-source"],
  },
  test: {
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

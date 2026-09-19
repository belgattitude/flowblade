import { defineConfig } from "vitest/config";

const testFiles = ["./src/**/*.test.{js,jsx,ts,tsx}"];
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    typecheck: {
      enabled: false,
    },
    // threads is good, vmThreads is faster (perf++) but comes with possible memory leaks
    // @link https://vitest.dev/config/#vmthreads
    pool: "fork",
    environment: "node",
    passWithNoTests: true,
    cache: {
      dir: "../../.cache/vitest/fastify-app",
    },
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

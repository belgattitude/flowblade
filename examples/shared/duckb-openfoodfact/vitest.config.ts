import { defineConfig } from "vitest/config";

const testFiles = ["./src/**/*.test.{js,jsx,ts,tsx}"];
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
      enabled: false,
    },
    // threads is good, vmThreads is faster (perf++) but comes with possible memory leaks
    // @link https://vitest.dev/config/#vmthreads
    pool: "forks",
    environment: "happy-dom",
    passWithNoTests: true,
    // setupFiles: './setup/tests/setupVitest.ts',
    coverage: {
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      provider: "v8",
      reporter: ["text", "clover"],
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

import {
  defineConfig,
  mergeConfig,
  vitestDefaultConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  vitestDefaultConfig,
  defineConfig({
    test: {
      include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
      globals: true,
      typecheck: {
        enabled: false,
      },
      // threads is good, vmThreads is faster (perf++) but comes with possible memory leaks
      // @link https://vitest.dev/config/#vmthreads
      pool: "forks",
      environment: "happy-dom",
      passWithNoTests: true,
      coverage: {
        reporter: ["clover"],
      },
      exclude: ["**/.next/**"],
    },
  })
);

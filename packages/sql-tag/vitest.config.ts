import {
  defineConfig,
  mergeConfig,
  vitestDefaultConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  vitestDefaultConfig,
  defineConfig({
    test: {
      include: ["./src/**/*.test.{js,ts}", "./test/**/*.test.{js,ts}"],
      globals: true,
      pool: "vmThreads",
      coverage: {
        // Fails if total coverage is under the thresholds
        thresholds: {
          lines: 55,
          statements: 55,
          functions: 55,
          branches: 50,
        },
      },
    },
  })
);

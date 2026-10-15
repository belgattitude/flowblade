import {
  defineConfig,
  mergeConfig,
  vitestDefaultConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  vitestDefaultConfig,
  defineConfig({
    test: {
      // Tests run on in-memory DuckDB databases, no external service required
      include: ["./src/**/*.test.ts"],
      benchmark: {
        include: ["./bench/**/*.bench.ts"],
      },
      // Default all tests to UTC
      globalSetup: "./vitest.setup.ts",
      coverage: {
        reporter: ["clover"],
      },
    },
  })
);

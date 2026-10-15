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
      passWithNoTests: false,
      // To mimic Jest behaviour regarding mocks.
      // @link https://vitest.dev/config/#clearmocks
      clearMocks: true,
      mockReset: true,
      restoreMocks: true,
      coverage: {
        // Fails if total coverage is under the thresholds
        thresholds: {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 70,
        },
      },
    },
  })
);

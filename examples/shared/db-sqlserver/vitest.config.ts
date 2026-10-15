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
      environment: "happy-dom",
      passWithNoTests: true,
      // To mimic Jest behaviour regarding mocks.
      // @link https://vitest.dev/config/#clearmocks
      clearMocks: true,
      mockReset: true,
      restoreMocks: true,
      coverage: {
        reporter: ["clover"],
      },
      exclude: ["**/.next/**"],
    },
  })
);

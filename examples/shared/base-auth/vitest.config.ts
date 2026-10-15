import {
  createVitestConfig,
  defineConfig,
  mergeConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  createVitestConfig({ react: true }),
  defineConfig({
    test: {
      include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
      globalSetup: "./vitest.setup.ts",
      globals: true,
      typecheck: {
        enabled: false,
      },
      passWithNoTests: true,
      coverage: {
        reporter: ["clover"],
      },
      exclude: ["**/.next/**"],
    },
  })
);

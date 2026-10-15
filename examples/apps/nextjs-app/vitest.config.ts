import { loadEnv } from "@flowblade/dx/vite";
import {
  createVitestConfig,
  defineConfig,
  mergeConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  createVitestConfig({ react: true, testingLibrary: true }),
  defineConfig({
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
      globals: true,
      typecheck: {
        enabled: false,
      },
      passWithNoTests: true,
      env: loadEnv("test", process.cwd(), ""),
      coverage: {
        reporter: ["clover"],
      },
      exclude: ["**/.next/**"],
    },
  })
);

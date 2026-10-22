import { loadEnv } from "@flowblade/dx/vite";
import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig(
  {
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
      globals: true,
      env: loadEnv("test", process.cwd(), ""),
      coverage: {
        reporter: ["clover"],
      },
      exclude: ["**/.next/**"],
    },
  },
  { react: true, testingLibrary: true }
);

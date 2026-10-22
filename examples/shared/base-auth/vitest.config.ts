import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig(
  {
    test: {
      include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
      globalSetup: "./vitest.setup.ts",
      globals: true,
      passWithNoTests: true,
      coverage: {
        reporter: ["clover"],
      },
    },
  },
  { react: true }
);

import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    coverage: {
      reporter: ["clover"],
    },
    // Inline projects inherit the options above
    projects: [
      {
        test: {
          name: "e2e",
          include: ["./tests/e2e/**/*.test.{js,jsx,ts,tsx}"],
          exclude: ["./tests/e2e/mssql/**", "./tests/e2e/azure/**"],
        },
      },
      {
        test: {
          name: "e2e-mssql",
          include: ["./tests/e2e/mssql/**/*.test.{js,jsx,ts,tsx}"],
          // Starts one container shared by all mssql test files
          globalSetup: ["./tests/e2e/mssql/global-setup.ts"],
          testTimeout: 10_000,
        },
      },
      {
        test: {
          name: "e2e-azure",
          include: ["./tests/e2e/azure/**/*.test.{js,jsx,ts,tsx}"],
          // Starts one Azurite container shared by all azure test files
          globalSetup: ["./tests/e2e/azure/global-setup.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});

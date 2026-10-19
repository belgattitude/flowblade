import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    include: [
      "./src/**/*.test.{js,jsx,ts,tsx}",
      "./tests/utils/**/*.test.{js,jsx,ts,tsx}",
    ],
    typecheck: {
      // Type tests live in *.test-d.ts files
      enabled: true,
    },
    tags: [
      {
        name: "network",
        description:
          "Requires network access (ie: downloading duckdb extensions). Skip with --tagsFilter='!network'",
      },
    ],
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
});

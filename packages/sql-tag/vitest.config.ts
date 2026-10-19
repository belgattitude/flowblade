import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
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
});

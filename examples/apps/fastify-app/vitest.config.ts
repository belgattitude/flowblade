import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
    globals: true,
    passWithNoTests: true,
    coverage: {
      reporter: ["clover"],
    },
  },
});

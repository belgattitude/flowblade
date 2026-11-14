import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    include: ["./e2e/**/*.test.ts"],
    globalSetup: "./e2e/global-setup.ts",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
});

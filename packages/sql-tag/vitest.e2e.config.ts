import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    include: ["./e2e/**/*.test.ts"],
    globals: true,
  },
});

import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    include: ["./src/**/*.test.{js,jsx,ts,tsx}"],
    globals: true,
    environment: "happy-dom",
    coverage: {
      reporter: ["clover"],
    },
  },
});

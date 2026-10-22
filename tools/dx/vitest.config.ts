import { createVitestConfig } from "./src/vitest.ts";

export default createVitestConfig({
  test: {
    include: ["./src/**/*.test.ts"],
  },
});

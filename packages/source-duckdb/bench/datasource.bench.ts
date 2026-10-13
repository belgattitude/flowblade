import { test } from "vitest";

test(`Bootstrap`, async ({ bench }) => {
  bench("test nothing", () => {
    const _a = ["hello"].map((x) => x.toUpperCase());
  });
});

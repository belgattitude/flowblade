import { defineConfig } from "vitest/config";

const sourceConditions = ["flowblade-monorepo-source", "import", "default"];

/**
 * Options shared by the unit (vitest.config.ts) and e2e (vitest.e2e.config.ts)
 * configs: resolve workspace packages from their sources.
 */
export const sharedConfig = defineConfig({
  resolve: {
    conditions: ["flowblade-monorepo-source"],
  },
  ssr: {
    resolve: {
      conditions: sourceConditions,
    },
  },
  environments: {
    // Global setup files run in vitest's own environment
    __vitest__: {
      resolve: {
        conditions: sourceConditions,
      },
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});

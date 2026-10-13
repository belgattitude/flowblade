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
  cacheDir: "../../.cache/vite/source-kysely",
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    /**
     * Module node_modules/.pnpm/@azure+identity@4.13.3_supports-color@7.2.0/node_modules/@azure/identity/dist/esm/index.js:3
     * seems to be an ES Module but shipped in a CommonJS package.
     * You might want to create an issue to the package "@azure/identity" asking them to ship the file in .mjs
     * extension or add "type": "module" in their package.json.
     */
    server: {
      deps: {
        inline: ["@azure/identity"],
      },
    },
  },
});

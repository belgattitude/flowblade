import {
  defineConfig,
  mergeConfig,
  vitestDefaultConfig,
} from "@flowblade/dx/vitest";

/**
 * Options shared by the unit (vitest.config.ts) and e2e (vitest.e2e.config.ts)
 * configs.
 */
export const sharedConfig = mergeConfig(
  vitestDefaultConfig,
  defineConfig({
    test: {
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
  })
);

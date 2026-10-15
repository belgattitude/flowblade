/**
 * Monorepo settings shared by the @flowblade/dx configs and bins.
 *
 * `src/typescript/tsconfig.base.json` can't import them: keep it in sync (see
 * `dx-config.test.ts`).
 */
export const dxConfig = {
  /**
   * Global cache directory, relative to the monorepo root. Holds one
   * `<tool>/<package path>` directory per tool and package.
   */
  cacheDir: ".cache",
  /**
   * Cache directory of each package, relative to the package (tsconfig
   * `tsBuildInfoFile`).
   */
  packageCacheDir: "node_modules/.cache",
  /**
   * Export conditions resolving the workspace packages to their sources
   * (tsconfig `customConditions`, vite and vitest `resolve.conditions`).
   */
  customConditions: ["flowblade-monorepo-source"],
} as const;

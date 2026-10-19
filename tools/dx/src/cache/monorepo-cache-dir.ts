import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

import { dxConfig } from "../dx-config.ts";

/**
 * Returns the monorepo root: the closest parent directory (`cwd` included)
 * containing a `pnpm-workspace.yaml`, or `undefined` when there's none.
 */
export const findMonorepoRoot = (
  cwd: string = process.cwd()
): string | undefined => {
  let dir = path.resolve(cwd);
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
  return dir;
};

/**
 * Environment variable moving the global cache out of the monorepo root (ie:
 * `/tmp`). The cache is written in its `<dxConfig.cacheDir>` subdirectory
 * (`/tmp/.cache`), so the existing content of the directory is never touched.
 */
export const dxBaseCacheDirEnv = "DX_BASE_CACHE_DIR";

/**
 * Environment variable disabling the dx caches when set to `1` or `true`: the
 * vitest module and results caches and the incremental TypeScript build info.
 */
export const dxDisableCacheEnv = "DX_DISABLE_CACHE";

/**
 * Returns `true` when `DX_DISABLE_CACHE` is `1` or `true` (case insensitive).
 */
export const isCacheDisabled = (
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  const value = env[dxDisableCacheEnv]?.toLowerCase();
  return value === "1" || value === "true";
};

/**
 * Returns the global cache directory: `<DX_BASE_CACHE_DIR>/<dxConfig.cacheDir>`
 * when `DX_BASE_CACHE_DIR` is set to an existing directory, otherwise
 * `<root>/<dxConfig.cacheDir>` (with a warning when the variable is set to a
 * missing path).
 */
export const getGlobalCacheDir = (
  root: string,
  env: NodeJS.ProcessEnv = process.env
): string => {
  const baseDir = env[dxBaseCacheDirEnv];
  if (baseDir !== undefined && baseDir !== "") {
    const resolved = path.resolve(baseDir);
    if (statSync(resolved, { throwIfNoEntry: false })?.isDirectory() === true) {
      return path.join(resolved, dxConfig.cacheDir);
    }
    console.warn(
      `[@flowblade/dx] ${dxBaseCacheDirEnv}=${baseDir} is not an existing directory, using ${path.join(root, dxConfig.cacheDir)}`
    );
  }
  return path.join(root, dxConfig.cacheDir);
};

/**
 * Returns the `<global cache dir>/<tool>/<package path>`
 * directory of the package in `cwd` (ie: `.cache/vitest/packages/core`), so
 * each package has its own cache, or `undefined` outside the monorepo. See
 * `getGlobalCacheDir` for the global cache directory.
 *
 * The directory is created when missing: `.cache` is gitignored, so it doesn't
 * exist on a fresh checkout (CI).
 */
export const getMonorepoCacheDir = (
  tool: string,
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): string | undefined => {
  const root = findMonorepoRoot(cwd);
  if (root === undefined) {
    return undefined;
  }
  const cacheDir = path.join(
    getGlobalCacheDir(root, env),
    tool,
    path.relative(root, path.resolve(cwd))
  );
  mkdirSync(cacheDir, { recursive: true });
  return cacheDir;
};

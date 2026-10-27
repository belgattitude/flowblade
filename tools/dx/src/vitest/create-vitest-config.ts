import path from "node:path";
import { fileURLToPath } from "node:url";

import codspeedPlugin from "@codspeed/vitest-plugin";
import react from "@vitejs/plugin-react";
import { mergeConfig, type ViteUserConfig } from "vitest/config";

import {
  getMonorepoCacheDir,
  isCacheDisabled,
} from "../cache/monorepo-cache-dir.ts";
import { dxConfig } from "../dx-config.ts";

const sourceConditions = [...dxConfig.customConditions, "import", "default"];

/**
 * `vitest bench` (dx-bench, dx-bench-codspeed): the config is loaded by the
 * vitest cli process, vitest doesn't expose its mode otherwise.
 */
const isBenchmarkRun = (): boolean => process.argv.slice(2).includes("bench");

const testingLibrarySetupFile = fileURLToPath(
  new URL("setup/testing-library.ts", import.meta.url)
);

export type CreateVitestConfigOptions = {
  /**
   * Add the `@vitejs/plugin-react` plugin and run the tests in the `happy-dom`
   * environment.
   * @default false
   */
  react?: boolean;
  /**
   * Add the `@testing-library/jest-dom` matchers (`toBeInTheDocument`...) to
   * `expect` and the `@testing-library/react` cleanup after each test with a
   * setup file. The package must depend on `@testing-library/react`.
   * @default false
   */
  testingLibrary?: boolean;
  /**
   * Add the `@codspeed/vitest-plugin` plugin (benchmarks).
   * @default process.env.CODSPEED === "1"
   */
  codspeed?: boolean;
  /**
   * Run each test file in an isolated environment (vitest `isolate`). Disabled
   * for the tests (faster, the modules are evaluated once per worker), kept for
   * the benchmarks and CodSpeed so their measurements don't depend on the
   * other files.
   * @default true for `vitest bench` or with `codspeed`, false otherwise
   */
  isolate?: boolean;
  /**
   * Directory of the vite (`cacheDir`) and vitest (`fsModuleCachePath`) caches,
   * `false` to keep the vite and vitest defaults.
   * @default `<monorepo root>/.cache/vitest/<package path>` (from the current working directory)
   */
  cache?: string | false;
  /**
   * Disable the vitest module (`fsModuleCache`) and results (`cache`) caches.
   * @default process.env.DX_DISABLE_CACHE is `1` or `true`
   */
  disableCache?: boolean;
};

/**
 * vitest base: workspace packages resolved from their sources
 * (`dxConfig.customConditions`), node (or happy-dom for react)
 * environment, no isolation outside the benchmarks and v8 coverage of `src`.
 */
const createVitestBaseConfig = (
  options: CreateVitestConfigOptions
): ViteUserConfig => {
  const {
    react: withReact = false,
    testingLibrary = false,
    codspeed = process.env.CODSPEED === "1",
    disableCache = isCacheDisabled(),
  } = options;
  const { isolate = codspeed || isBenchmarkRun() } = options;
  const { cache = disableCache ? false : getMonorepoCacheDir("vitest") } =
    options;
  const cacheDir = cache === false ? undefined : cache;
  return {
    ...(cacheDir === undefined
      ? {}
      : { cacheDir: path.join(cacheDir, "vite") }),
    plugins: [
      ...(withReact ? [react()] : []),
      ...(codspeed ? [codspeedPlugin()] : []),
    ],
    resolve: {
      conditions: [...dxConfig.customConditions],
      // The setup file imports the package's @testing-library/react (not
      // resolvable from @flowblade/dx): the same instance as the tests
      ...(testingLibrary ? { dedupe: ["@testing-library/react"] } : {}),
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
      environment: withReact ? "happy-dom" : "node",
      isolate,
      ...(testingLibrary ? { setupFiles: [testingLibrarySetupFile] } : {}),
      // Not the shared `node_modules/.vitest-cache` of the workspace root: it is
      // cleared when the lockfile changes, which fails when the packages run
      // their tests in parallel (ENOTEMPTY)
      ...(cacheDir === undefined
        ? {}
        : { fsModuleCachePath: path.join(cacheDir, "modules") }),
      ...(disableCache ? { cache: false, fsModuleCache: false } : {}),
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/.{idea,git,cache,output,temp}/**",
      ],
      coverage: {
        include: ["src/**/*.{js,jsx,ts,tsx}"],
        provider: "v8",
        reporter: ["text"],
      },
    },
  };
};

/**
 * vitest config of a package: the dx base (see `createVitestBaseConfig`) with
 * the package `config` merged over it (vitest `mergeConfig`: the arrays are
 * concatenated, don't repeat the base values).
 *
 * @example
 * export default createVitestConfig({
 *   test: { include: ["./src/**\/*.test.ts"] },
 * });
 */
export const createVitestConfig = (
  config: ViteUserConfig = {},
  options: CreateVitestConfigOptions = {}
): ViteUserConfig =>
  mergeConfig(createVitestBaseConfig(options), config) as ViteUserConfig;

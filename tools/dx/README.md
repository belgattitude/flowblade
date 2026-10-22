# @flowblade/dx

Shared tooling for the flowblade monorepo: lint, format, TypeScript, build, dist checks and test configurations, the bins running the pinned tool versions, and the cache management.

This package is private: it is only consumed inside the workspace.

## Contents

- [Install](#install)
- [Bins](#bins)
- [oxlint](#oxlint)
  - [Default config](#default-config)
  - [React config](#react-config)
  - [Next.js config](#nextjs-config)
- [oxfmt](#oxfmt)
  - [Tailwind CSS](#tailwind-css)
- [TypeScript](#typescript)
  - [Base tsconfig](#base-tsconfig)
  - [React tsconfig](#react-tsconfig)
  - [Next.js tsconfig](#nextjs-tsconfig)
  - [Type checking](#type-checking)
  - [Type checking with bun](#type-checking-with-bun)
- [tsdown](#tsdown)
- [es-check](#es-check)
- [size-limit](#size-limit)
- [vitest](#vitest)
  - [Default config](#default-vitest-config)
  - [Options](#options)
  - [React and Testing Library](#react-and-testing-library)
  - [Package dependencies](#package-dependencies)
  - [Benchmarks](#benchmarks)
- [Caches](#caches)
  - [Locations](#locations)
  - [dx-cache](#dx-cache)
  - [vitest module cache](#vitest-module-cache)
  - [TypeScript build info](#typescript-build-info)
- [Monorepo settings](#monorepo-settings)
- [Exports](#exports)
- [Agent skill](#agent-skill)

## Install

Add it as a dev dependency of the workspace package:

```json
{
  "devDependencies": {
    "@flowblade/dx": "workspace:*"
  }
}
```

The tools are shipped as regular dependencies of this package, so their versions are pinned in a single place:

| Dependency | Used by |
| --- | --- |
| `oxlint`, `oxlint-tsgolint`, `oxfmt`, `ultracite` | every package |
| `eslint-plugin-security`, `oxlint-plugin-import-zod` | every package (JS plugins loaded by `oxlintDefaultConfig`) |
| `oxlint-tailwindcss`, `@tanstack/eslint-plugin-query`, `eslint`, `oxlint-plugin-react-doctor` | React and Next.js packages only (`createOxlintReactConfig`, `createOxlintNextjsConfig`) |
| `typescript` | every package (`dx-typecheck`) |
| `tsdown`, `@arethetypeswrong/core`, `publint`, `browserslist`, `browserslist-to-esbuild` | publishable packages (`tsdownDefaultConfig`, `tsdownBrowserConfig`) |
| `es-check` | publishable packages (`escheckDefaultConfig`, `escheckBrowserConfig`) |
| `size-limit`, `@size-limit/file`, `@size-limit/rolldown` | publishable packages (`createSizeLimitConfig`) |
| `vitest`, `vite`, `@vitest/coverage-v8`, `@vitest/ui`, `@codspeed/vitest-plugin` | tested packages (`@flowblade/dx/vitest`) |
| `@vitejs/plugin-react`, `happy-dom` | React packages only (`createVitestConfig(config, { react: true })`) |
| `@testing-library/jest-dom`, `@testing-library/dom` | packages using Testing Library (`createVitestConfig(config, { testingLibrary: true })`) |
| `std-env` | `dx-unless-ci` |

## Bins

The bins run the tool versions pinned by @flowblade/dx, forwarding the arguments, the signals and the exit code:

| Bin | Description |
| --- | --- |
| `dx-oxlint` | runs oxlint, with `OXLINT_TSGOLINT_PATH` pointing to the pinned tsgolint (unless already set) |
| `dx-oxfmt` | runs oxfmt |
| `dx-typecheck` | runs tsc, or `bun check` with `--bun` (see [Type checking](#type-checking)) |
| `dx-typecheck-bun` | runs `bun check`, same as `dx-typecheck --bun` |
| `dx-build` | runs tsdown |
| `dx-escheck` | runs es-check with the package `escheck.config.ts` |
| `dx-size-limit` | runs size-limit with the `@size-limit/file` and `@size-limit/rolldown` plugins of @flowblade/dx |
| `dx-vitest` | runs vitest |
| `dx-bench` | runs the vitest benchmarks, on node or bun (`--runtime`), see [Benchmarks](#benchmarks) |
| `dx-bench-codspeed` | runs the vitest benchmarks with the CodSpeed instrumentation |
| `dx-doctor` | prints the monorepo root, the global cache directory (`DX_BASE_CACHE_DIR`), the typescript and vitest caches (with their number of files and size) and the turbo cache when turbo is installed, `--json` for a JSON output, `--show-cache=<base\|typescript\|vitest\|turbo>` to only print the directory of a cache (root `dx:doctor` script) |
| `dx-cache` | shows the number and size of the cached files (`stats`) or removes the caches (`clean`), see [dx-cache](#dx-cache) |
| `dx-unless-ci` | runs the given command (`dx-unless-ci <command> [args...]`) unless a CI environment is detected by [std-env](https://github.com/unjs/std-env) (`isCI`), exits with 0 in CI (root `prepare` script) |

```json
{
  "scripts": {
    "bench": "dx-bench",
    "bench-codspeed": "dx-bench-codspeed",
    "build": "dx-build",
    "dev": "dx-build --watch",
    "check-dist": "dx-escheck",
    "check-size": "dx-size-limit",
    "format": "dx-oxfmt --write",
    "lint": "dx-oxfmt --check --no-error-on-unmatched-pattern && dx-oxlint",
    "lint-fix": "dx-oxlint --fix && dx-oxfmt --write",
    "test-unit": "dx-vitest run",
    "test-unit-coverage": "dx-vitest run --coverage",
    "typecheck": "dx-typecheck --project tsconfig.json --noEmit",
    "typecheck-bun": "dx-typecheck-bun --project tsconfig.json --noEmit"
  }
}
```

## oxlint

### Default config

`oxlintDefaultConfig` extends the ultracite `core` and `vitest` presets and adds:

- type-aware linting (`oxlint-tsgolint`)
- the `eslint-plugin-security` and `oxlint-plugin-import-zod` JS plugins (zod must be imported as a namespace)
- the monorepo ignore patterns
- `pedantic` and `nursery` rules turned off, `typescript/require-await` enabled and `typescript/no-deprecated` as a warning

```ts
// oxlint.config.ts
import { oxlintDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [oxlintDefaultConfig],
  overrides: [],
});
```

`typescript/require-await` is re-enabled in the last `**/*` override of the base. To turn it off in a package, use an override too, a top level `rules` entry is not enough:

```ts
export default defineConfig({
  extends: [oxlintDefaultConfig],
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "typescript/require-await": "off",
      },
    },
  ],
});
```

### React config

`createOxlintReactConfig` is the default config plus:

- the react, react-perf and jsx-a11y rules (ultracite `react` preset)
- the TanStack rules (ultracite `tanstack` preset) and the React Query rules of `oxlint-plugin-react-doctor`
- the `@tanstack/eslint-plugin-query` rules (recommended + `prefer-query-options`)
- the `oxlint-tailwindcss` rules (Tailwind CSS v4)

oxlint does not merge the `settings` of an extended config, so spread the returned config as the root one instead of putting it in `extends`. Merge its `rules` when adding your own:

```ts
// oxlint.config.ts
import { createOxlintReactConfig } from "@flowblade/dx";
import { defineConfig } from "oxlint";

const reactConfig = createOxlintReactConfig({
  // the css file containing `@import "tailwindcss"`
  tailwindEntryPoint: "src/styles/globals.css",
});

export default defineConfig({
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
  },
  overrides: [],
});
```

### Next.js config

`createOxlintNextjsConfig` is the React config plus the oxlint `nextjs` plugin rules (ultracite `next` preset). On the Next.js route files (`page`, `layout`, `error`...), it turns off `react/function-component-definition` so they keep the `export default function Page()` convention.

It takes the same options as the React config and is used the same way. It also returns `overrides`, merge them when adding your own:

```ts
// oxlint.config.ts
import { createOxlintNextjsConfig } from "@flowblade/dx";
import { defineConfig } from "oxlint";

const nextjsConfig = createOxlintNextjsConfig({
  tailwindEntryPoint: "src/styles/globals.css",
});

export default defineConfig({
  ...nextjsConfig,
  rules: {
    ...nextjsConfig.rules,
  },
  overrides: [...nextjsConfig.overrides],
});
```

## oxfmt

```ts
// oxfmt.config.ts
export { oxfmtDefaultConfig as default } from "@flowblade/dx";
```

### Tailwind CSS

In a Tailwind CSS package, give oxfmt the stylesheet. Otherwise it sorts the classes without the theme, in a different order than the `tailwindcss/enforce-sort-order` lint rule:

```ts
// oxfmt.config.ts
import { oxfmtDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...oxfmtDefaultConfig,
  sortTailwindcss: {
    ...(typeof oxfmtDefaultConfig.sortTailwindcss === "object"
      ? oxfmtDefaultConfig.sortTailwindcss
      : {}),
    stylesheet: "./src/styles/globals.css",
  },
});
```

## TypeScript

### Base tsconfig

```json
{
  "extends": "@flowblade/dx/typescript/tsconfig.base.json"
}
```

- `include` and `exclude` use `${configDir}`, so they resolve relative to the extending `tsconfig.json`: no need to repeat them. Overriding one of them replaces the base value (not merged).
- `customConditions` resolves the workspace packages to their sources (see [Monorepo settings](#monorepo-settings)).
- the incremental build info is written in `<root>/.cache/typescript` by `dx-typecheck`, in `node_modules/.cache/typescript` otherwise (see [TypeScript build info](#typescript-build-info)).

### React tsconfig

`tsconfig.react.json` is the base tsconfig plus:

- `"jsx": "react-jsx"` and the `dom.iterable` lib
- the `.storybook` files (TypeScript globs skip the dot directories, so they are included explicitly)
- `storybook-static` excluded. The base exclude of the dot directories is dropped: TypeScript applies `exclude` after `include`, so it would exclude `.storybook` too

```json
{
  "extends": "@flowblade/dx/typescript/tsconfig.react.json",
  "compilerOptions": {
    "types": [
      "@types/node",
      "vitest/globals",
      "@testing-library/jest-dom/vitest"
    ]
  }
}
```

`types` replaces the base value (not merged): repeat `@types/node` and `vitest/globals` when adding one.

### Next.js tsconfig

`tsconfig.nextjs.json` is the React tsconfig plus the `next` TypeScript plugin, `next-env.d.ts` and the types generated by Next.js (`.next/types` and `.next/dev/types`).

```json
{
  "extends": "@flowblade/dx/typescript/tsconfig.nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/components/*": ["./src/components/*"]
    }
  }
}
```

`compilerOptions.plugins` replaces the base value: keep `{ "name": "next" }` when adding a plugin.

### Type checking

`dx-typecheck` runs the tsc pinned by @flowblade/dx with the given arguments. It stores the incremental build info in `<root>/.cache/typescript/<package path>/<tsconfig name>.tsbuildinfo` (see [TypeScript build info](#typescript-build-info)). tsc prints nothing when there's no error, so `dx-typecheck` adds a summary with the duration (not with `--help`, `--version`, `--showConfig`, `--listFilesOnly`, `--init` or `--watch`):

```text
$ dx-typecheck --project tsconfig.json --noEmit
✓ No type errors [284.83ms]
```

### Type checking with bun

With `--bun` (or the `dx-typecheck-bun` bin), it runs `bun check` instead: bun >= 1.4.3, the bun of the `PATH` (it's not pinned). It reports the same errors as tsc using all the CPU cores, and prints its own summary. The other arguments are forwarded (`--project`, compiler options...):

```text
$ dx-typecheck-bun --project tsconfig.json --noEmit
✓ No type errors in 165 files [138.74ms]
```

Every package has a `typecheck-bun` script next to `typecheck`: run them all with `pnpm g:typecheck-bun` (turbo `typecheck-bun` task).

`bun check` runs the `check` script of the package.json in the working directory instead of the type checker when there's one: `dx-typecheck` runs it from the tmp directory, with an absolute `--project` (the current directory by default).

## tsdown

`tsdownDefaultConfig` builds `./src/index.ts` as esm only, with:

- declarations from `./tsconfig.build.json` (src only)
- the `attw` (`esm-only` profile) and `publint` checks, failing on errors
- `platform: "neutral"`, treeshaking and `minify: "dce-only"`
- a `node22` esbuild target

`tsdownBrowserConfig` is the same config with the browsers of the package `.browserslistrc` added to the target (resolved from the current working directory, i.e. the package being built). The resolved target is logged when building:

```text
[@flowblade/dx] tsdown browserslist enabled, target: node22, chrome109, edge119, ...
```

`createTsdownConfig({ browserslist })` returns one or the other (`browserslist` defaults to `false`).

```ts
// tsdown.config.ts
import { tsdownBrowserConfig } from "@flowblade/dx";
import { defineConfig } from "@flowblade/dx/tsdown";

export default defineConfig({
  ...tsdownBrowserConfig,
  // override what differs, e.g.:
  entry: ["./src/index.ts", "./src/utils/index.ts"],
});
```

The browserslist log comes from the `hooks` of `tsdownBrowserConfig`: setting your own `hooks` replaces it.

## es-check

`escheckDefaultConfig` checks the esm files of `dist` (`./dist/**/*.{js,mjs}`) only use es2022 syntax.

`escheckBrowserConfig` checks them against the ES version supported by the browsers of the package `.browserslistrc` instead (es-check `checkBrowser`). `dx-escheck` logs `[@flowblade/dx] es-check browserslist enabled` when it is used.

`createEscheckConfig({ browserslist })` returns one or the other (`browserslist` defaults to `false`).

```ts
// escheck.config.ts
export { escheckBrowserConfig as default } from "@flowblade/dx";
```

es-check only reads json configs: `dx-escheck` loads the `escheck.config.{ts,mts,js,mjs}` of the current directory (default export, a config or an array of configs) and passes it to es-check as a temporary json file.

## size-limit

The limits are specific to each package, so there's no default config: `createSizeLimitConfig(checks, { browserslist })` returns the checks as is, or with `browserslist: true`, bundles them for the browsers of the package `.browserslistrc` (rolldown `transform.target`) instead of the rolldown default (esnext). The resolved target is logged on stderr (to keep `--json` parsable):

```text
[@flowblade/dx] size-limit browserslist enabled, target: chrome109, edge119, ...
```

```ts
// .size-limit.ts
import { createSizeLimitConfig } from "@flowblade/dx";

export default createSizeLimitConfig(
  [
    {
      name: "Import * (ESM)",
      path: ["dist/index.js"],
      import: "*",
      limit: "4kb",
    },
  ],
  { browserslist: true }
);
```

size-limit loads its plugins from the dependencies of the checked package. `dx-size-limit` runs the size-limit cli steps with the plugins of @flowblade/dx instead, so the packages don't depend on `size-limit` or its plugins. It relies on size-limit internals (not exported): check it when upgrading size-limit.

## vitest

<a id="default-vitest-config"></a>

### createVitestConfig

`createVitestConfig(config?, options?)` (`@flowblade/dx/vitest`) creates the unit and e2e configs: the package `config` is merged (vitest `mergeConfig`) over the dx base:

- workspace packages resolved from their sources (`dxConfig.customConditions`), also in the global setup files
- `node` environment and the usual excludes (`node_modules`, `dist`, `coverage`...)
- no isolation between the test files (`isolate: false`, the modules are evaluated once per worker), except for the benchmarks (`vitest bench`, `dx-bench`) and CodSpeed
- v8 coverage of `src` with the `text` reporter
- the `@codspeed/vitest-plugin` when `CODSPEED=1`
- the vite and vitest caches in `<root>/.cache/vitest/<package path>` (see [Caches](#caches))

The test files, coverage thresholds... are specific to each package. Arrays like `exclude` or `coverage.reporter` are concatenated, so only add what differs.

```ts
// vitest.config.ts
import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig({
  test: {
    include: ["./src/**/*.test.ts"],
    coverage: {
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
```

A config shared by several configs (unit and e2e) can be created once and merged again with `mergeConfig` (re-exported, like `defineConfig`).

### Options

The second argument changes the dx base:

| Option | Default | Description |
| --- | --- | --- |
| `react` | `false` | adds the `@vitejs/plugin-react` plugin and uses the `happy-dom` environment |
| `testingLibrary` | `false` | adds a setup file extending `expect` with the `@testing-library/jest-dom` matchers (`toBeInTheDocument`...) |
| `codspeed` | `process.env.CODSPEED === "1"` | adds the `@codspeed/vitest-plugin` (set by `dx-bench-codspeed`) |
| `isolate` | `true` for `vitest bench` or with `codspeed`, `false` otherwise | vitest `isolate`: set it to `true` (or `test.isolate`) for tests relying on a fresh module state (module level mocks or state shared between files) |
| `cache` | `<root>/.cache/vitest/<package path>` | directory of the vite (`vite`) and vitest (`modules`) caches, `false` for the vite and vitest defaults |
| `disableCache` | `DX_DISABLE_CACHE` is `1` or `true` | disables the vitest module (`fsModuleCache`) and results (`cache`) caches |

### React and Testing Library

```ts
// vitest.config.ts of a React package
import { createVitestConfig } from "@flowblade/dx/vitest";

export default createVitestConfig(
  {
    test: {
      include: ["./src/**/*.test.{ts,tsx}"],
    },
  },
  { react: true, testingLibrary: true }
);
```

`testingLibrary` only adds the matchers. `@testing-library/react` registers its `cleanup` after each test only with `globals: true`: otherwise call it in an `afterEach`.

### Package dependencies

The packages still depend on what their test files and tsconfig import:

- `vitest`, at the version pinned by @flowblade/dx: the test files import it (`import { describe, vi } from "vitest"`, the mock hoisting only works with that import)
- `@testing-library/react`, `@testing-library/user-event` (imported by the tests) and `@testing-library/jest-dom`, at the version pinned by @flowblade/dx (its types are enabled in the tsconfig: `"types": ["@testing-library/jest-dom/vitest"]`)

`vite`, `@vitest/coverage-v8`, `@vitest/ui`, `happy-dom` and the plugins come from @flowblade/dx.

### Benchmarks

`dx-bench` runs the vitest benchmarks once (`vitest bench --run`), forwarding the other vitest options (`--reporter=verbose`, `--config`...):

| Option | Description |
| --- | --- |
| `--runtime=node` | runs vitest on node (default) |
| `--runtime=bun` | runs vitest on bun (`bun --bun`, the bun of the `PATH`). Pass `--reporter=verbose` to get the results table |
| `--watch`, `-w` | runs the benchmarks in watch mode |
| `-h`, `--help` | shows the help |

`dx-bench-codspeed` runs them once on node with `CODSPEED=1`: the vitest config of @flowblade/dx then adds the `@codspeed/vitest-plugin`. Run it in the CodSpeed runner (CI) to get measurements: outside of it, the benchmarks run without instrumentation.

```json
{
  "scripts": {
    "bench": "dx-bench --reporter=verbose",
    "bench-bun": "dx-bench --runtime=bun --reporter=verbose",
    "bench-codspeed": "dx-bench-codspeed",
    "bench-watch": "dx-bench --watch"
  }
}
```

Run them all with `pnpm g:bench` and `pnpm g:bench-codspeed` (turbo `bench` and `bench-codspeed` tasks, one package at a time). The `bench-codspeed` task isn't cached and passes the `CODSPEED_*` variables set by the CodSpeed runner (turbo strict env mode would filter them otherwise).

## Caches

### Locations

The caches are written out of the package sources:

| Tool | Cache |
| --- | --- |
| vitest | `<root>/.cache/vitest/<package path>/vite` (vite `cacheDir`) and `<root>/.cache/vitest/<package path>/modules` (vitest `fsModuleCachePath`), set by `createVitestConfig` (`cache` option) |
| typescript | `<root>/.cache/typescript/<package path>/<tsconfig name>.tsbuildinfo`, set by `dx-typecheck` (`--tsBuildInfoFile`). Fallback for the other tools (plain `tsc`, tsdown declarations): `<package>/node_modules/.cache/typescript/tsconfig.tsbuildinfo`, the `tsBuildInfoFile` of `tsconfig.base.json` |
| oxlint | none, oxlint and tsgolint don't cache |

`getMonorepoCacheDir(tool)` returns `<root>/.cache/<tool>/<package path>`, the root being the closest parent directory of the current working directory containing a `pnpm-workspace.yaml`. It creates the directory when missing: `.cache` is gitignored, so a fresh checkout (CI) doesn't have it. Outside the monorepo, vitest keeps its defaults.

Set `DX_BASE_CACHE_DIR` to an existing directory to move the global cache out of the monorepo root: the caches are then written in its `.cache` subdirectory (`DX_BASE_CACHE_DIR=/tmp` gives `/tmp/.cache/<tool>/<package path>`), so the existing content of the directory is never touched. When the directory doesn't exist, the root `.cache` is used, with a warning. `DX_BASE_CACHE_DIR` is in the turbo `globalPassThroughEnv`. `dx-doctor` (root `pnpm dx:doctor`) prints the resolved directory.

```text
$ dx-doctor
Monorepo
  root               /home/me/flowblade

Runtime
  package manager    pnpm 12.13.0 (devEngines)
  js runtime         node 24.21.0
  platform           linux x64
  libc               glibc 2.36

Caches
  base               /home/me/flowblade/.cache                28 files  1.03 MB
  typescript         /home/me/flowblade/.cache/typescript      2 files   846 kB
  vitest             /home/me/flowblade/.cache/vitest         26 files   185 kB
  turbo              /home/me/flowblade/.turbo             1,835 files  2.23 MB

Turbo
  version            2.11.8
  config             turbo.jsonc

Env
  DX_BASE_CACHE_DIR  (not set)
  DX_DISABLE_CACHE   (not set)
  TURBO_CACHE_DIR    (not set)
```

Set `DX_DISABLE_CACHE=1` (or `true`) to disable the caches: `createVitestConfig` turns off the vitest module (`fsModuleCache`) and results (`cache`) caches, and `dx-typecheck` runs tsc with `--incremental false` (unless `--incremental` is given). It's in the turbo `globalPassThroughEnv`: it doesn't change the turbo cache keys, use `turbo run --force` (or `TURBO_FORCE=true`) to bypass the turbo cache too.

The runtime section shows the package manager (the `devEngines.packageManager` of the root package.json, then its `packageManager`, then the one running the script, then the lockfile; `running <version>` when the running one differs), the JavaScript runtime (node, bun or deno, `dx-doctor` runs with all of them), the platform and the C library on Linux (glibc or musl, from `detect-libc`).

`--show-cache=<cache>` only prints the directory of a cache, `base` (the global cache), `typescript`, `vitest` or `turbo`, for the scripts:

```bash
du -sh "$(dx-doctor --show-cache=vitest)"
```

The turbo cache is `TURBO_CACHE_DIR`, else the `cacheDir` of `turbo.json(c)`, else `.turbo/cache` (turbo default).

### dx-cache

`dx-cache` manages the global cache (`<root>/.cache` or `<DX_BASE_CACHE_DIR>/.cache`, one directory per tool) and the cache of the root and of every package (`node_modules/.cache`), from any directory of the monorepo:

| Command | Description |
| --- | --- |
| `dx-cache stats` | shows the number and the size of the cached files, with a total |
| `dx-cache clean` | removes the caches (it's the root `clean:global-cache` script), `--dry-run` to list them |
| `dx-cache --help` | shows the help |

```text
$ dx-cache stats
Cache                                                   Files      Size
-----------------------------------------------------------------------
.cache/vitest                                             159    1.3 MB
examples/apps/nextjs-app/node_modules/.cache                1    2.0 MB
packages/core/node_modules/.cache                           1  414.3 KB
...
-----------------------------------------------------------------------
Total                                                     173   10.7 MB
```

### vitest module cache

By default, the vitest module cache (`fsModuleCache`) is shared by the whole workspace in `node_modules/.vitest-cache`, and cleared when the lockfile changes: packages running their tests in parallel then fail with `ENOTEMPTY` when they clear it at the same time. With one cache per package, each package only clears its own.

### TypeScript build info

A tsconfig can't point the `.tsbuildinfo` of each package to `<root>/.cache` (`${configDir}` resolves to the package directory). `dx-typecheck` passes `--tsBuildInfoFile <root>/.cache/typescript/<package path>/<tsconfig name>.tsbuildinfo` instead (overriding the tsconfig, unless `--tsBuildInfoFile` is given), so `typecheck` and `typecheck-build` get their own file:

```text
.cache/typescript/packages/core/tsconfig.tsbuildinfo
.cache/typescript/packages/core/tsconfig.build.tsbuildinfo
```

The tools reading the tsconfig directly (plain `tsc`, the tsdown declarations) use the `tsBuildInfoFile` of `tsconfig.base.json`: `${configDir}/node_modules/.cache/typescript/tsconfig.tsbuildinfo`. Every tsconfig extending the base shares it: give the other ones their own, e.g. in `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "tsBuildInfoFile": "${configDir}/node_modules/.cache/typescript/tsconfig.build.tsbuildinfo"
  }
}
```

## Monorepo settings

`dxConfig` holds the settings shared by the configs and bins of @flowblade/dx:

| Setting | Value | Used by |
| --- | --- | --- |
| `cacheDir` | `.cache` | global cache, relative to the monorepo root (`getMonorepoCacheDir`, vitest, `dx-cache`) |
| `packageCacheDir` | `node_modules/.cache` | cache of each package (tsconfig `tsBuildInfoFile`, `dx-cache`) |
| `customConditions` | `["flowblade-monorepo-source"]` | export conditions resolving the workspace packages to their sources (tsconfig `customConditions`, vite and vitest `resolve.conditions`) |

`tsconfig.base.json` can't import them: `src/dx-config.test.ts` (`test-unit` script) fails when its `customConditions` or `tsBuildInfoFile` doesn't match. The packages `exports` use the condition name too (`"flowblade-monorepo-source": "./src/index.ts"`).

## Exports

`@flowblade/dx`:

| Export | Description |
| --- | --- |
| `oxlintDefaultConfig` | [oxlint default config](#default-config) |
| `createOxlintReactConfig(options)` | [oxlint React config](#react-config) |
| `createOxlintNextjsConfig(options)` | [oxlint Next.js config](#nextjs-config) |
| `oxfmtDefaultConfig` | [oxfmt config](#oxfmt) |
| `tsdownDefaultConfig` | [tsdown config](#tsdown) for publishable (node) packages |
| `tsdownBrowserConfig` | [tsdown config](#tsdown) for publishable packages also running in browsers |
| `createTsdownConfig(options)` | creates one of the tsdown configs (`{ browserslist: boolean }`) |
| `escheckDefaultConfig` | [es-check config](#es-check) for publishable (node) packages |
| `escheckBrowserConfig` | [es-check config](#es-check) for publishable packages also running in browsers |
| `createEscheckConfig(options)` | creates one of the es-check configs (`{ browserslist: boolean }`) |
| `createSizeLimitConfig(checks, options)` | [size-limit config](#size-limit) for the given checks (`{ browserslist: boolean }`) |
| `dxConfig` | [monorepo settings](#monorepo-settings) |
| `getMonorepoCacheDir(tool, cwd?)` | `<root>/.cache/<tool>/<package path>` (see [Locations](#locations)) |
| `findMonorepoRoot(cwd?)` | closest parent directory containing a `pnpm-workspace.yaml` |

Subpaths:

| Export | Description |
| --- | --- |
| `@flowblade/dx/vitest` | [`createVitestConfig(config, options)`](#default-vitest-config) and re-export of `vitest/config` (`defineConfig`, `mergeConfig`…) |
| `@flowblade/dx/vite` | re-export of `vite` (`loadEnv`…) |
| `@flowblade/dx/oxlint` | re-export of `oxlint` (`defineConfig`…) |
| `@flowblade/dx/oxfmt` | re-export of `oxfmt` (`defineConfig`, `format`…) |
| `@flowblade/dx/tsdown` | re-export of `tsdown` (`defineConfig`, `mergeConfig`…) |
| `@flowblade/dx/typescript/tsconfig.base.json` | [base tsconfig](#base-tsconfig) |
| `@flowblade/dx/typescript/tsconfig.react.json` | [React tsconfig](#react-tsconfig) |
| `@flowblade/dx/typescript/tsconfig.nextjs.json` | [Next.js tsconfig](#nextjs-tsconfig) |

## Agent skill

`skills/flowblade-dx/SKILL.md` teaches coding agents how to use @flowblade/dx: the configs, the bins, adding a package and the common mistakes. It's declared in the `agents.skills` field of the package.json and locked in the root `skills-lock.json`: [skills](https://github.com/vercel-labs/skills) links it in the agent directories (`.claude/skills`, `.agents/skills`...) with `pnpm exec skills experimental_sync`.

Update it with this README.

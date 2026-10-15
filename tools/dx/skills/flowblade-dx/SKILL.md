---
name: flowblade-dx
description: >
  Use this skill when changing the tooling of a package in the flowblade monorepo: oxlint, oxfmt, tsconfig, type checking, tsdown builds, es-check, size-limit, vitest configs or the caches. Covers the @flowblade/dx configs and dx-* bins, adding a new package, the React/Next.js variants, the monorepo source condition and the common mistakes (array merging, tsconfig overrides, bun check, vitest cache). Trigger whenever the user edits a vitest.config.ts, tsconfig*.json, oxlint.config.ts, oxfmt.config.ts, tsdown.config.ts, escheck.config.ts, .size-limit.ts or the lint, build, test or typecheck scripts of a workspace package.
license: MIT
---

# @flowblade/dx

`@flowblade/dx` (`tools/dx`) is the private package holding the tooling of the flowblade monorepo. Every workspace package depends on it (`"@flowblade/dx": "workspace:*"`) and extends its configs instead of writing its own. The tool versions are pinned in `tools/dx/package.json` only: run them through the `dx-*` bins.

Full reference: `tools/dx/README.md`.

## Rules

- Extend the dx configs, never copy their content into a package. Only add what differs.
- Upgrade a tool (oxlint, vitest, tsdown, typescript...) in `tools/dx/package.json`, not in the packages.
- Use the `dx-*` bins in the package scripts, not the tool bins.
- Import the tool APIs from the dx subpaths (`@flowblade/dx/vitest`, `@flowblade/dx/vite`, `@flowblade/dx/tsdown`...), except in test files (see vitest).
- Shared values (cache directories, source condition) live in `dxConfig` (`tools/dx/src/dx-config.ts`).

## Package scripts

```json
{
  "scripts": {
    "bench": "dx-bench",
    "bench-codspeed": "dx-bench-codspeed",
    "build": "dx-build",
    "check-dist": "dx-escheck",
    "check-size": "dx-size-limit",
    "format": "dx-oxfmt --write",
    "lint": "dx-oxfmt --check --no-error-on-unmatched-pattern && dx-oxlint",
    "lint-fix": "dx-oxlint --fix && dx-oxfmt --write",
    "test-unit": "vitest run",
    "typecheck": "dx-typecheck --project tsconfig.json --noEmit",
    "typecheck-bun": "dx-typecheck-bun --project tsconfig.json --noEmit"
  }
}
```

| Bin | Runs |
| --- | --- |
| `dx-oxlint`, `dx-oxfmt` | oxlint (with the pinned tsgolint), oxfmt |
| `dx-typecheck` | tsc, prints `✓ No type errors [Xms]` on success; `--bun` runs `bun check` |
| `dx-typecheck-bun` | `bun check` (bun >= 1.4.3 from the PATH) |
| `dx-build` | tsdown |
| `dx-escheck`, `dx-size-limit` | es-check, size-limit with the dx plugins |
| `dx-vitest` | vitest |
| `dx-bench` | `vitest bench --run`, `--runtime=node` (default) or `--runtime=bun`, `--watch` |
| `dx-bench-codspeed` | `vitest bench --run` on node with `CODSPEED=1` (CodSpeed plugin) |
| `dx-cache` | `stats` (files and size of the caches), `clean` (`--dry-run`), `--help` |

The test scripts keep calling `vitest` (the packages depend on it, and `dx-vitest` doesn't run under deno).

## oxlint and oxfmt

```ts
// oxlint.config.ts
import { oxlintDefaultConfig } from "@flowblade/dx";
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [oxlintDefaultConfig], overrides: [] });
```

```ts
// oxfmt.config.ts
export { oxfmtDefaultConfig as default } from "@flowblade/dx";
```

- React + Tailwind CSS: `createOxlintReactConfig({ tailwindEntryPoint })`, Next.js: `createOxlintNextjsConfig({ tailwindEntryPoint })`. Spread them as the root config (`...reactConfig`), don't put them in `extends`: oxlint doesn't merge the `settings` of an extended config. Merge their `rules` (and `overrides` for Next.js) with your own.
- `typescript/require-await` is enabled in the last `**/*` override of the base: turn it off with an override, not a top level `rules` entry.
- oxlint has no cache.

## TypeScript

```json
{
  "extends": "@flowblade/dx/typescript/tsconfig.base.json"
}
```

Use `tsconfig.react.json` (jsx, `.storybook` files) or `tsconfig.nextjs.json` (React + `next` plugin, `next-env.d.ts`, `.next/types`) instead for those packages.

- `include` and `exclude` use `${configDir}`: don't repeat them. An override replaces the base value, it's not merged.
- `types` replaces the base value: repeat `@types/node` and `vitest/globals` when adding one (e.g. `@testing-library/jest-dom/vitest`). Same for `compilerOptions.plugins` in Next.js (keep `{ "name": "next" }`).
- The base sets `customConditions: ["flowblade-monorepo-source"]` (workspace packages resolved to their `src`) and writes the build info to `node_modules/.cache/typescript/tsconfig.tsbuildinfo`. A second tsconfig (e.g. `tsconfig.build.json` extending `./tsconfig.json`) must set its own `tsBuildInfoFile`, e.g. `${configDir}/node_modules/.cache/typescript/tsconfig.build.tsbuildinfo`.
- Don't call `bun check` directly in a package having a `check` script: bun runs that script instead of type checking. `dx-typecheck --bun` / `dx-typecheck-bun` handle it.

## vitest

```ts
// vitest.config.ts
import {
  defineConfig,
  mergeConfig,
  vitestDefaultConfig,
} from "@flowblade/dx/vitest";

export default mergeConfig(
  vitestDefaultConfig,
  defineConfig({
    test: {
      include: ["./src/**/*.test.ts"],
      coverage: {
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
      },
    },
  })
);
```

`vitestDefaultConfig` sets the source condition (also for the global setup files), the `node` environment, the usual excludes, v8 coverage of `src` (`text` reporter), the codspeed plugin when `CODSPEED=1` and the caches in `<root>/.cache/vitest/<package path>`.

`createVitestConfig(options)`:

| Option | Default | Effect |
| --- | --- | --- |
| `react` | `false` | `@vitejs/plugin-react` + `happy-dom` environment |
| `testingLibrary` | `false` | setup file adding the `@testing-library/jest-dom` matchers |
| `codspeed` | `CODSPEED === "1"` | `@codspeed/vitest-plugin` |
| `cache` | `<root>/.cache/vitest/<package path>` | vite and vitest cache directory, `false` for their defaults |

Mistakes to avoid:

- `mergeConfig` concatenates arrays: don't repeat the base values. Add `coverage.reporter: ["clover"]` (gives `["text", "clover"]`), not `["text", "clover"]`. Don't repeat `coverage.provider`, `coverage.include` or the base excludes.
- Don't set `cacheDir` or `fsModuleCachePath`: the shared default `node_modules/.vitest-cache` is cleared when the lockfile changes and parallel runs fail with `ENOTEMPTY`. Use the `cache` option.
- Test files import from `"vitest"` (the `vi.mock` hoisting needs it), so a package keeps `vitest` in its dev dependencies, at the dx version. Same for `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom` when its tests or tsconfig use them. `vite`, `@vitest/coverage-v8`, `@vitest/ui`, `happy-dom` and the plugins come from dx: don't add them to the package.
- Benchmarks: use `dx-bench` / `dx-bench-codspeed` in the `bench` / `bench-codspeed` scripts, don't set `CODSPEED=1` (or add `cross-env`) in a package script nor the codspeed plugin in a vitest config.
- `testingLibrary` doesn't register the `cleanup`: `@testing-library/react` only does it with `globals: true`, otherwise call it in an `afterEach`.

## Publishable packages

- `tsdown.config.ts`: `defineConfig({ ...tsdownDefaultConfig, ...overrides })` from `@flowblade/dx/tsdown`, or `tsdownBrowserConfig` for packages also running in browsers (target from `.browserslistrc`). Declarations come from `tsconfig.build.json`. Setting `hooks` replaces the browserslist log of `tsdownBrowserConfig`.
- `escheck.config.ts`: `export { escheckDefaultConfig as default } from "@flowblade/dx";` (es2022) or `escheckBrowserConfig`.
- `.size-limit.ts`: `createSizeLimitConfig(checks, { browserslist })`, the limits are per package.

## Caches

| Tool       | Location                                                 |
| ---------- | -------------------------------------------------------- |
| vitest     | `<root>/.cache/vitest/<package path>/{vite,modules}`     |
| typescript | `<package>/node_modules/.cache/typescript/*.tsbuildinfo` |

`dx-cache stats` shows them, `dx-cache clean` (root `pnpm clean:global-cache`) removes them.

## Adding a package

1. `devDependencies`: `"@flowblade/dx": "workspace:*"`, `typescript`, plus `vitest` (and the Testing Library packages) when it has tests.
2. Add `oxlint.config.ts`, `oxfmt.config.ts`, `tsconfig.json` and `vitest.config.ts` extending the dx configs as above.
3. Add the package scripts above. For a publishable package, add `tsdown.config.ts`, `tsconfig.build.json` (with its own `tsBuildInfoFile`), `escheck.config.ts` and `.size-limit.ts`.
4. Check with `pnpm --filter <name> run lint`, `typecheck` and `test-unit`.

## Changing @flowblade/dx itself

- Configs live in `tools/dx/src`, bins in `tools/dx/bin` (plain `.mjs`, they can import the `.ts` sources through node type stripping).
- `tsconfig.base.json` can't import `dxConfig`: keep `customConditions` and `tsBuildInfoFile` in sync, `pnpm --filter @flowblade/dx run test-unit` checks it.
- A new bin needs a `pnpm install` to be linked in the packages.
- Document the change in `tools/dx/README.md`.

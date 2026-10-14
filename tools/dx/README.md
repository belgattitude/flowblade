# @flowblade/dx

Shared lint, format and TypeScript configurations for the flowblade monorepo.

This package is private: it is only consumed inside the workspace.

## Install

Add it as a dev dependency of the workspace package:

```json
{
  "devDependencies": {
    "@flowblade/dx": "workspace:*"
  }
}
```

The lint and format tooling is shipped as regular dependencies of this package, so the versions are pinned in a single place:

| Dependency | Used by |
| --- | --- |
| `oxlint`, `oxlint-tsgolint`, `oxfmt`, `ultracite` | every package |
| `eslint-plugin-security`, `oxlint-plugin-import-zod` | every package (JS plugins loaded by `oxlintDefaultConfig`) |
| `oxlint-tailwindcss`, `@tanstack/eslint-plugin-query`, `eslint`, `oxlint-plugin-react-doctor` | React and Next.js packages only (`createOxlintReactConfig`, `createOxlintNextjsConfig`) |
| `tsdown`, `@arethetypeswrong/core`, `publint`, `browserslist`, `browserslist-to-esbuild` | publishable packages (`tsdownDefaultConfig`, `tsdownBrowserConfig`) |
| `es-check` | publishable packages (`escheckDefaultConfig`, `escheckBrowserConfig`) |
| `size-limit`, `@size-limit/file`, `@size-limit/esbuild` | publishable packages (`createSizeLimitConfig`) |

Use the `dx-oxlint`, `dx-oxfmt`, `dx-build`, `dx-escheck` and `dx-size-limit` bins to run the pinned oxlint, oxfmt, tsdown, es-check and size-limit versions.

## Exports

| Export | Description |
| --- | --- |
| `oxlintDefaultConfig` | oxlint base for every package |
| `createOxlintReactConfig(options)` | oxlint base for React + Tailwind CSS packages |
| `createOxlintNextjsConfig(options)` | oxlint base for Next.js apps |
| `oxfmtDefaultConfig` | oxfmt configuration |
| `tsdownDefaultConfig` | tsdown base for publishable (node) packages |
| `tsdownBrowserConfig` | tsdown base for publishable packages also running in browsers |
| `createTsdownConfig(options)` | creates one of the tsdown bases (`{ browserslist: boolean }`) |
| `escheckDefaultConfig` | es-check base for publishable (node) packages |
| `escheckBrowserConfig` | es-check base for publishable packages also running in browsers |
| `createEscheckConfig(options)` | creates one of the es-check bases (`{ browserslist: boolean }`) |
| `createSizeLimitConfig(checks, options)` | size-limit config for the given checks (`{ browserslist: boolean }`) |
| `@flowblade/dx/typescript/tsconfig.base.json` | base `tsconfig.json` |
| `@flowblade/dx/oxlint` | re-export of `oxlint` (`defineConfig`…) |
| `@flowblade/dx/oxfmt` | re-export of `oxfmt` (`defineConfig`, `format`…) |
| `@flowblade/dx/tsdown` | re-export of `tsdown` (`defineConfig`, `mergeConfig`…) |

## Bins

| Bin | Description |
| --- | --- |
| `dx-oxlint` | runs the pinned oxlint, with `OXLINT_TSGOLINT_PATH` pointing to the pinned tsgolint (unless already set) |
| `dx-oxfmt` | runs the pinned oxfmt |
| `dx-build` | runs the pinned tsdown |
| `dx-escheck` | runs the pinned es-check with the package `escheck.config.ts` |
| `dx-size-limit` | runs the pinned size-limit with the `@size-limit/file` and `@size-limit/esbuild` plugins of @flowblade/dx |

```json
{
  "scripts": {
    "build": "dx-build",
    "dev": "dx-build --watch",
    "check-dist": "dx-escheck",
    "check-size": "dx-size-limit",
    "format": "dx-oxfmt --write",
    "lint": "dx-oxfmt --check --no-error-on-unmatched-pattern && dx-oxlint",
    "lint-fix": "dx-oxlint --fix && dx-oxfmt --write"
  }
}
```

## oxlint

### Default base

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

### React base

`createOxlintReactConfig` is the default base plus:

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

### Next.js base

`createOxlintNextjsConfig` is the React base plus the oxlint `nextjs` plugin rules (ultracite `next` preset). On the Next.js route files (`page`, `layout`, `error`...), it turns off `react/function-component-definition` so they keep the `export default function Page()` convention.

It takes the same options as the React base and is used the same way. It also returns `overrides`, merge them when adding your own:

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

## tsdown

`tsdownDefaultConfig` builds `./src/index.ts` as esm only, with:

- declarations from `./tsconfig.build.json` (src only)
- the `attw` (`esm-only` profile) and `publint` checks, failing on errors
- `platform: "neutral"`, treeshaking and `minify: "dce-only"`
- a `node22` esbuild target

`tsdownBrowserConfig` is the same base with the browsers of the package `.browserslistrc` added to the target (resolved from the current working directory, i.e. the package being built). The resolved target is logged when building:

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
  // override what differs, ie:
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

The limits are specific to each package, so there's no default config: `createSizeLimitConfig(checks, { browserslist })` returns the checks as is, or with `browserslist: true`, bundles them for the browsers of the package `.browserslistrc` (esbuild `target`) instead of the esbuild default (esnext). The resolved target is logged on stderr (to keep `--json` parsable):

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

## TypeScript

```json
{
  "extends": "@flowblade/dx/typescript/tsconfig.base.json"
}
```

`include` and `exclude` use `${configDir}`, so they resolve relative to the extending `tsconfig.json`: no need to repeat them. Overriding one of them replaces the base value (not merged).

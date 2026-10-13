# Packages reference

A guide to present and legacy package names

## Grid

Using any of these current or legacy grid packages implies that a project uses the "grid" product, and breaking changes should be loaded from the grid documentation site.

### Current grid packages

- `ag-grid-community`
- `ag-grid-enterprise`
- `ag-grid-react`, `ag-grid-angular`, `ag-grid-vue3` — framework wrappers
- `@ag-grid-community/locale` - locales

## Legacy / removed packages and required migrations

Version ranges below are the actual first/last published versions on npm. "Last usable" is the highest major a package can be used at; moving past it requires the migration described.

- `ag-grid` (original monolithic package, `2.0.0` → `18.1.2`): renamed to `ag-grid-community` at v18.1.2 (2018). A project on bare `ag-grid` is pre-v18 — far below this skill's supported source floor (grid major ≥ 25), so it is out of range: identify it, then **STOP** and tell the user it predates the supported upgrade path. Replaced by `ag-grid-community`.
- `ag-grid-vue` (Vue 2 wrapper, `8.0.0` → `31.3.4`) and `@ag-grid-community/vue` (scoped Vue 2 wrapper, `22.0.0` → `31.3.4`): no longer updated; their last release is v31. Moving past v31 requires migrating the host application from Vue 2 to Vue 3 (and switching to `ag-grid-vue3`) — a Vue framework migration that is OUTSIDE this skill's scope. If the project depends on either and the target is v32 or later, **STOP** (like an out-of-range version): do not build a plan, do not change anything. Tell the user they must first migrate their application to Vue 3 and switch to `ag-grid-vue3`, then re-run this skill.
- Org-scoped "modules" packages (`@ag-grid-community/*`, `@ag-grid-enterprise/*`): existed `22.0.0` → `32.3.9` (the scope did not exist before v22). EXCEPT for the locale and styles packages listed as current above, all were replaced from v33 onwards by importing module objects from the tree-shakable top-level packages. See `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/`.
  - `@ag-grid-enterprise/*` replaced by `ag-grid-enterprise`
  - `@ag-grid-community/*` (except locale) replaced by `ag-grid-community`
  - `@ag-grid-community/styles` replaced by import from `ag-grid-community/styles`
  - `@ag-grid-community/{react,angular,vue3}` (framework wrappers, vue3 from `24.1.1`): replaced by `ag-grid-{react,angular,vue3}`
- `ag-grid-charts-enterprise` was removed in v33. Import `AgChartsEnterpriseModule` from `ag-grid-enterprise` instead, see `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#integrated-charts--sparklines`

## Charts

Using any of these charts packages implies that an app uses the "charts" product, and breaking changes should be loaded from the charts documentation site.

### Current charts packages

- `ag-charts-community`, `ag-charts-enterprise` — standalone charts
- `ag-charts-react`, `ag-charts-angular`, `ag-charts-vue3` — framework wrappers
- `ag-charts-locale` — locale data (optional)
- `ag-charts-types` — transitive dependency; not installed directly
- `ag-charts-server-side` — server-side rendering (confirm whether user-facing before acting on it)

### Version coupling for integrated charts

When the grid integrated charts feature is used, the grid and charts dependencies must use compatible versions

AG Grid and AG Charts are released in lockstep on the same day, with a constant major-version offset of 22, and a requirement to use the same minor and patch version, so for example when using grid v34.2.1, charts v12.2.1 must be used for integrated charts.

## Studio

Using any of these packages implies that an app uses the "studio" product, and breaking changes should be loaded from the studio documentation site.

### Current studio packages

- `ag-studio` — the core package, installed directly by vanilla JS/TS apps
- `ag-studio-react`, `ag-studio-angular`, `ag-studio-vue3` — framework wrappers
- `ag-studio-locale` — locale data (optional, standalone, depends on nothing)

There are no legacy or removed studio packages: the product's first real release is `1.0.0`. `0.0.1` is an empty name-reservation placeholder, not a usable release.

There is no community/enterprise package split — every studio package is commercially licensed, and the feature tier (Core / Pro / Pro-AI) is determined by the licence key passed to `AgStudioLicenseManager.setLicenseKey`, not by the choice of package. Vue 2 is not supported and there is no `ag-studio-vue` package.

### Version coupling

The framework wrappers depend on an EXACT pin of `ag-studio` — `ag-studio-react@2.0.1` requires `ag-studio@2.0.1`. A project using a wrapper must move both to the same version together.

`ag-studio` itself depends on `ag-grid-enterprise` and `ag-charts-enterprise`. It is not necessary to install these just to use Studio. If your project has to declare its own dependency on grid or charts, declared versions must satisfy the range `ag-studio` requires. Where there is any doubt, read it directly with `npm view ag-studio@{version} dependencies`.

AG Studio is released in lockstep with AG Grid and AG Charts, with a constant major-version offset of 34 from grid and 12 from charts, and the same minor version, so for example studio v2.0 uses grid v36.0 and charts v14.0. The dependency is declared as a tilde range (e.g. `~36.0.0`), so the patch version floats within that minor and does not track studio's own patch number.

**One-off exception, studio v1.x only:** studio 1.0 launched part-way through the grid 35 cycle, so the v1 line runs two minors ahead — studio 1.0 uses grid 35.2 / charts 13.2, and studio 1.1 uses grid 35.3 / charts 13.3. The offset resets at the v2 major boundary and the constant rule above holds from v2 onwards.

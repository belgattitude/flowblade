# AG Charts — writing & debugging correct code

Where docs pages are provided below they are a slug, load the page from `https://www.ag-grid.com/charts/archive/{major.minor.patch}/{framework}/{slug}/` as described in documentation-index.md.

## Common mistakes

- AG Charts and AG Grid release in lockstep: charts major = grid major − 22 (e.g. charts 13.x ↔ grid 35.x). For grid charting features (integrated charts, sparklines) use the matching major/minor pair.
- The API object is `AgCharts` (plural), not `AgChart`: `import { AgCharts } from 'ag-charts-community'; const chart = AgCharts.create(options)`. There is no `AgChart.create` and no `AgEnterpriseCharts` export — both are older names still present in training data. In React the component is also `AgCharts`, imported from `ag-charts-react` (not the old `AgChartsReact`).
- Presets are NOT created with `AgCharts.create`: financial charts use `AgCharts.createFinancialChart(options)`, gauges use `AgCharts.createGauge(options)`. Passing preset options to `AgCharts.create()` is silently rejected — each option is logged as "Unknown option, ignoring" and the chart shows "No data to display".
- The chart container needs a height. With no explicit `width`/`height` option the chart fills its container element; an unsized container falls back to the `minWidth`/`minHeight` default of 300px and may mis-size. `container` must be an `HTMLElement`, not an id string. Docs: `layout`
- Data can be set once on the chart (`options.data`, shared by all series) or per-series (`series[].data`, overrides chart-level). Each series maps columns via keys — `xKey`/`yKey` (cartesian), `angleKey`/`calloutLabelKey` (pie/donut) — and a series with no matching keys renders nothing silently. Docs: `data-configuration`
- Updating data/options requires a NEW options object; in-place mutation does not update the chart. Use `AgChartInstance.update(options)` (full, returns a Promise), `updateDelta(partial)`, or `applyTransaction(...)` for incremental data — spread into a fresh object rather than re-passing the mutated one. Docs: `transactions`, `high-frequency-data`
  - `updateDelta` merges top-level properties but replaces `series`/`axes` array items wholesale by index — spread the original item before changing one field, or you drop its other options and it typically throws.
- Tooltip renderers return a structured object — `{ heading?, title?, data?: [{ label, value }] }` — not an HTML `content` string. The `content` field was removed in v13; returning it renders a blank tooltip. Docs: `tooltips`
- Community series are `bar`, `line`, `area`, `scatter`, `bubble`, `histogram`, `pie`, `donut`. Everything else (candlestick, heatmap, waterfall, radar/radial, sankey, treemap, sunburst, maps, gauges, org chart, …) is enterprise-only and requires `ag-charts-enterprise` plus a licence key. Docs: `community-vs-enterprise`
- Theme is a keyword string or an object, never `true`. Keywords: `ag-default`, `ag-sheets`, `ag-polychroma`, `ag-vivid`, `ag-material`, each with a `-dark` variant, plus `ag-financial`/`ag-financial-dark` for financial charts. Pass an object (`{ baseTheme, palette, overrides }`) to customise. Docs: `themes`
- The enterprise licence key API is `LicenseManager.setLicenseKey` from `ag-charts-enterprise`, not `AgCharts.setLicenseKey`. Call once at startup before creating charts. Docs: `license-install`

### Major version transitions

- Module registration is mandatory from v13: call `ModuleRegistry.registerModules([...])` before creating charts. When prototyping, register the everything-bundles (`AllCommunityModule`/`AllEnterpriseModule`) and leave a TODO to swap for fine-grained modules. Docs: `module-registry`
- From v13, `axes` is a dictionary keyed `x`/`y` (cartesian) or `angle`/`radius` (polar) — `axes: { x: { type: 'category' }, y: { type: 'number' } }` — not the old array form. Bind a series to a secondary axis with `yKeyAxis`/`xKeyAxis` (there is no `axes` object on a series). Docs: `axes-configuration`, `axes-types`
- Bar and column series merged: use `type: 'bar'` for both vertical and horizontal bars — the separate `type: 'column'` was removed. Docs: `bars`

## Performance (high-volume / high-frequency)

- Prefer a single root-level `data` array shared by all series over per-series `series[].data` — one shared dataset is much easier for AG Charts to optimise.
- Prefer the fastest update path that fits the change: `applyTransaction()` (incremental append/prepend/remove) is faster than `updateDelta()` (partial), which is faster than `update()` (full replacement). Docs: `high-frequency-data`, `transactions`
- Callbacks are expensive — `itemStyler` and `styler` especially. Avoid them on hot paths; when you must use one, pass a stable static function reference rather than a fresh inline closure, so results stay cached instead of invalidating on every update.
- For a custom `theme`, use a static, immutable object reference — a stable reference lets AG Charts cache the processed theme instead of reprocessing it each update. Docs: `themes`
- For time series, use numeric timestamps rather than `Date` objects (avoids round-tripping and memory churn), and prefer a continuous time axis over a non-continuous or category-based axis.

## Enable development mode debugging and pay attention to console messages

AG products log error information to the console when configured to do so. Enabling these validations _significantly_ improves AI agent development experience allowing the agent to diagnose and fix issues.

**Do this first, before writing feature code — not after something goes wrong.** AG Charts logs validation issues to the console by default, but it then applies a fallback and keeps rendering, so a misconfigured option often just looks like a feature that does nothing. A console message is easy to scroll past or dismiss as noise, which leads to wrongly concluding the API is unsupported and rewriting working code. Making validation issues throw turns each one into a failure that can't be missed.

1. Enable development time validations

```ts
const options: AgChartOptions = {
  // ...
  // for v14.2 and above; v14.1 and below only log to the console
  validations: process.env.NODE_ENV !== "production"
    ? { throwOn: ["error", "warning", "deprecation"] }
    : undefined,
};
```

`throwOn` errors are thrown asynchronously, after the chart has reported the issue and applied its fallback. They cannot be caught around `AgCharts.create()` or `update()`; they surface as uncaught errors in the console, `window.onerror` and test runners. Never enable `throwOn` in production. Docs: `dev-validation`

2. Where practical, include a real browser in the verification loop, e.g. using Chrome MCP or Playwright, and look out for console messages.

## React

The component (`AgCharts` from `ag-charts-react`) takes a single object prop, `options`.

- Hold `options` in `useState` (or `useMemo`); a freshly-constructed object each render forces a full chart update. Update by replacing the object (e.g. `setChartOptions`), not by mutating it in place.
- When changing some keys within options, use the immutable update pattern popularised by Redux: preserve reference equality for keys that haven't changed.

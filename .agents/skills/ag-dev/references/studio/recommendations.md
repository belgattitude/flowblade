# AG Studio — writing & debugging correct code

Where docs pages are provided below they are a slug, load the page from `https://www.ag-grid.com/studio/archive/{major.minor.patch}/{framework}/{slug}/` as described in documentation-index.md.

AG Studio is a new product and very underrepresented in your training data, so there is a high risk of inventing plausible-but-wrong APIs, or not using new correct APIs. Even more so than for other AG products, the instruction to consult docs before writing code applies here. Do not guess the API surface. When setting up from scratch, read the `quick-start` docs page basic package and API usage.

## Common mistakes

- **AG Studio pulls in AG Grid and AG Charts as dependencies and releases in lockstep with both** From Studio 2.0 onwards, Studio version = grid version − 34, and Studio version = charts version − 12 (e.g. Studio 2.0 depends grid 36.0 and charts 14.0). If you need to declare a grid or charts dependency in your package.json, ensure that it is exactly the same version as depended on by studio, to avoid runtime incompatibilities and bloated bundle size.
- The API is created imperatively via `createStudio(rootDiv, properties, params?)` imported from `ag-studio` — it returns the `AgStudioApi`. There is no `new Studio(...)`, no `Studio.create(...)`. Docs: `quick-start`, `installation`
- The single config argument is `AgStudioProperties` (NOT "options"/"config"/"gridOptions"). Its real top-level keys include: `data`, `mode`, `initialState`, `theme`, `layout`, `panels`, `page`, `widgets`, `components`, `dataOptions`, `ai`, `localeText`/`getLocaleText`, `context`, plus `on*` event handlers (`onStateUpdated`, `onApiReady`, `onStudioReady`, `onErrorRaised`, `onStudioPreDestroyed`). Do not invent keys — verify against the `AgStudioProperties` type.
- `mode` is `'view' | 'edit'` and **defaults to `'view'`**. To get the drag-and-drop report builder you must set `mode:'edit'`. Docs: `modes-layout`
- The Studio container needs an explicit height/width — Studio fills its parent, so a parent with no intrinsic height renders at zero height. Docs: `quick-start`
- For a regular Studio app, do not install, import, or register `ag-grid-community`/`ag-grid-enterprise`/`ag-charts-*` yourself, and do not call their `ModuleRegistry`/`LicenseManager`. `ag-studio` bundles AG Grid + AG Charts (enterprise) and registers the required modules internally on import. Docs: `installation`
- Data is configured via the `data` property: an `AgDataSourcesDefinition` shaped as `{ sources: [{ id, data: [...plain objects] }, ...] }`, or an `AgDataEngine`. It is NOT `rowData`/`columnDefs` — Studio has no grid-style column definitions at the top level. The data engine derives fields, does joins/aggregation/filtering in-browser. Docs: `data`, `sync-data`, `data-setup`
- **Updating `data` after init is largely a no-op**: only changes to synchronous data are processed; adding/removing sources, changing fields, async changes are ignored. Treat data-source structure as init-time. Docs: `async-data`, `server-side-data`
- Persist/restore the whole dashboard as one JSON object: seed with the `initialState` property (read **once** at init only), and read back with `api.getState()` / write with `api.setState(state)`. Setting the `initialState` property again later does nothing. Docs: `state`
- Widgets are chosen by registered type, not free strings — the built-in widget/chart types are provided types like `AgBarChartGrouped`, `AgColumnChartStacked`, `AgLineChart`, `AgPieChart`, `AgDonutChart`, `AgScatterChart`, `AgBubbleChart`, `AgGridWidget`, `AgValueWidget` (KPI), `AgTextWidget`, `AgImageWidget`, gauges (`AgLinearGauge`/`AgRadialGauge`), and filter widgets (`AgListFilterWidget`, `AgButtonFilterWidget`, `AgDateFilterWidget`). Add/override/hide them via the `widgets` property (`AgWidgetsConfig`, or a function receiving the defaults). Custom widgets use `custom-widgets` with a `comp`. Docs: `widgets`, `widget-configuration`, `custom-widgets`
- Theming uses a Studio-specific Theming API, not AG Grid's `themeQuartz` and not CSS files. Use the exported `studioTheme` (default), `createStudioTheme`, `studioGridTheme`, and pass via the `theme` property. Grid-widget and chart-widget theming are configured through the Studio theme params, not by theming ag-grid/ag-charts directly. Docs: `theming`, `theme-builder`
- `api.updateProperties(props)` accepts only the runtime-managed subset (`ManagedStudioProperties`) — properties marked `@initial` (e.g. `initialState`, `localeText`, `studioId`, `suppressTouch`) cannot be changed after creation. `api.refresh(widgetId?)` re-runs queries. Always `api.destroy()` on teardown.
- The framework wrappers detect prop changes by **reference identity** and push them via `updateProperties` — replace a whole property object to update it; mutating in place is not seen.
  - Especially in React, inline object/array props (`data={{…}}`, `theme={…}`, `widgets={…}`) recreated every render read as a change each render — memoize them (`useMemo`/`useState`/module constant). StrictMode double-invocation is handled by the wrapper; do not add your own init guards.
- The AI Assistant (`ai` property, `AgAiAssistant` / adapter) is **experimental**; behaviour varies by LLM. Don't assume a stable/default AI backend. Docs: `ai`, `ai-adapter`, `ai-configuration`

## Pay attention to console messages

AG Studio logs validation errors and warnings to the console. Where practical, include a real browser in the verification loop (e.g. Chrome MCP or Playwright) and watch for console messages — a configuration issue causing an actual bug will often be described in detail by the console error messenger.

## Angular

- Angular wrapper events are `@Output`s **without** the `on` prefix: `(apiReady)`, `(stateUpdated)`, `(studioReady)`, `(errorRaised)` — not `(onApiReady)`. (The React wrapper uses the `on*` prop form, e.g. `onApiReady`.)

## React

Stabilise every non-primitive prop by reference; a new reference each render resets Studio state.

- Object or array props (`data`, `panels`, `layout`, etc) use `useState` / `useMemo` to preserve reference equality when unchanged.
- function props via `useCallback` with correct deps.
- Event handlers (`onStateUpdated` etc.) don't require `useCallback`, new values don't trigger re-render

---
name: ag-dev
description: Use BEFORE writing or changing any code that touches AG Grid, AG Charts or AG Studio - including adding or configuring columns, themes, styling, cell rendering, data or any grid/chart feature, and when planning such work. Grounds the code in the APIs that exist in the version in use, instead of recalled ones.
---

## Be aware of the AG products in use, and their versions and wrapper framework

Products in use may be obvious from the context, if not it can be determined from the package that features are imported from:

- `grid` packages start @ag-grid- or ag-grid-
- `charts` packages start ag-charts-
- `studio` package is ag-studio or starts ag-studio-

{product} below refers to grid, charts or studio.

Versions can be determined from project's package.json or by reading the installed library's package.json inside node_modules

Framework is `react`, `vue`, `angular` if using those frameworks, `javascript` for Vanilla JS apps or for apps on any other framework (e.g. Svelte, Solid).

## For package version updates, use the ag-update skill

This skill ships with a sibling skill, "ag-update". Delegate to it when asked to update grid, charts or studio packages.

## Don't guess

Whenever writing code, you must have a clear source for the APIs you use, whether that's following existing patterns, instructions from the user or consulting our docs. If you're unsure, do research to ground your actions.

## Prefer the purpose-built feature over a general-purpose primitive

Where the product ships a dedicated feature for what you are building, use it — not a `valueGetter`, a custom cell renderer, hand-rolled state or your own event wiring that produces the same visible result. Sorting, filtering, aggregation, export and the UI all understand the built-in feature; a primitive is opaque application code that has to re-implement that behaviour and keep it in step by hand.

"The primitive renders the right value" is not a reason to reject the built-in feature. Neither is the feature being unfamiliar to you: your training data lags the current version, so unfamiliar is not evidence of unsupported.

**Check before you implement, not after.** Before building a requested capability out of a primitive, scan `references/{product}/documentation-index.md` for a slug describing that capability and read the page if one plausibly matches. For Enterprise features, follow the module-registration guidance in the product recommendations.

## By default consult the docs

When writing code you will encounter two problems:

1. Your training data contains many deprecated and removed APIs and package names and may not have newer APIs.
2. APIs have non-obvious edge cases and interactions with other features.

The solution to both of these is to consult the documentation.

If it is clear exactly what API to use, eg you are following a detailed plan that names specific APIs, or there are other examples in the codebase to copy, you may write code directly.

Otherwise if there is uncertainty, check the docs. To find the correct docs URL for the version in use, load `references/{product}/documentation-index.md` and follow the instructions in that file.

Locate the feature you are working with in the docs and read surrounding paragraphs to get information on edge cases and interactions. If many docs pages seem potentially relevant, consider getting a sub-agent to read them all and extract information relevant to the task.

## Load product-specific recommendations

`references/{product}/recommendations.md` contains specific advice for each product including known LLM failure modes and key APIs that have changed between versions. Load it and take it into account when developing.

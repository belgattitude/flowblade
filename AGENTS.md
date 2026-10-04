# Agent instructions for flowblade monorepo

This repository is a TypeScript monorepo managed by **pnpm 12** and **Turborepo**.

## Repository Structure

- `packages/*`: Core library packages.
- `examples/*`: Example applications and shared demo code.
- `integrations/*`: Integration tests and adapters.
- `docs/`: Documentation.

## Tech Stack

- **Package Manager**: pnpm 12 (`pnpm`) with an isolated `node_modules` linker (check `pnpm-workspace.yaml`).
- **Orchestration**: Turborepo (`turbo`).
- **Language**: TypeScript.
- **Testing**: Vitest (`vitest`).
- **Linting**: Ultracite with oxlint and oxfmt.
- **Building**: `tsdown`, `tsc`, or `turbo run build`.

## Common Commands

Run these from the root:

- `pnpm g:build`: Build all packages (excluding examples/docs).
- `pnpm g:test-unit`: Run unit tests for all packages.
- `pnpm g:lint`: Lint the entire repository.
- `pnpm g:lint-fix`: Auto fix lint errors in the entire repository.
- `pnpm g:typecheck`: Run TypeScript type checking.
- `pnpm -r run <script>`: Run a script in all workspaces.

## Package-Specific Development

Each package in `packages/` has its own `package.json` and local scripts:

- `pnpm --filter @flowblade/<package-name> run typecheck`: Run typecheck for a specific package.
- `pnpm --filter @flowblade/<package-name> run test-unit`: Run unit tests for a specific package.
- `pnpm --filter @flowblade/<package-name> run test-e2e`: Run e2e tests for a specific package.
- `pnpm --filter @flowblade/<package-name> run lint`: Run lint for a specific package.
- `pnpm --filter @flowblade/<package-name> run lint-fix`: Run lint auto fixes for a specific package.
- `pnpm --filter @flowblade/<package-name> run build`: Build a specific package.

## Coding Standards

- Follow the existing Ultracite with oxlint and oxfmt configurations.
- Use Vitest for new tests.
- Prefer explicit types where possible, but leverage TS inference.
- Use `workspace:^` for internal cross-package dependencies.

## Key Packages

- `@flowblade/core`: Shared contracts and utilities.
- `@flowblade/sqlduck`: DuckDB-powered data processing.
- `@flowblade/source-duckdb`: DuckDB datasource.
- `@flowblade/source-kysely`: Kysely datasource.
- `@flowblade/sql-tag`: SQL template tag utilities.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

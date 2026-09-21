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

# Agent instructions for flowblade monorepo

This repository is a TypeScript monorepo managed by **Yarn 4** (Berry) and **Turborepo**.

## Repository Structure

- `packages/*`: Core library packages.
- `examples/*`: Example applications and shared demo code.
- `integrations/*`: Integration tests and adapters.
- `docs/`: Documentation.

## Tech Stack

- **Package Manager**: Yarn 4 (`yarn`) with `node_modules` linker (check `.yarnrc.yml`).
- **Orchestration**: Turborepo (`turbo`).
- **Language**: TypeScript.
- **Testing**: Vitest (`vitest`).
- **Linting**: ESLint with custom base configs.
- **Building**: `tsdown`, `tsc`, or `turbo run build`.

## Common Commands

Run these from the root:

- `yarn g:build`: Build all packages (excluding examples/docs).
- `yarn g:test-unit`: Run unit tests for all packages.
- `yarn g:lint`: Lint the entire repository.
- `yarn g:typecheck`: Run TypeScript type checking.
- `yarn workspaces foreach -A run <script>`: Run a script in all workspaces.

## Package-Specific Development

Each package in `packages/` has its own `package.json` and local scripts:

- `yarn workspace @flowblade/<package-name> run test`: Run tests for a specific package.
- `yarn workspace @flowblade/<package-name> run build`: Build a specific package.

## Coding Standards

- Follow the existing ESLint and Prettier configurations.
- Use Vitest for new tests.
- Prefer explicit types where possible, but leverage TS inference.
- Use `workspace:^` for internal cross-package dependencies.

## Key Packages

- `@flowblade/core`: Shared contracts and utilities.
- `@flowblade/sqlduck`: DuckDB-powered data processing.
- `@flowblade/source-duckdb`: DuckDB datasource.
- `@flowblade/source-kysely`: Kysely datasource.
- `@flowblade/sql-tag`: SQL template tag utilities.

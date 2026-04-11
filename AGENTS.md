# Agent instructions for flowblade monorepo

This repository is a TypeScript monorepo managed by **Yarn 4** (Berry) and **Turborepo**.

## Repository Structure

- `packages/*`: Core library packages.
- `examples/*`: Example applications and shared demo code.
- `integrations/*`: Integration tests and adapters.
- `docs/`: Documentation.

> **Note**: Agents can safely ignore content in `.turbo`, `.turbo-pruned`, and `.cache` directories as they contain build artifacts and temporary data.

## Tech Stack

- **Package Manager**: Yarn 4 (`yarn`) with `node_modules` linker (check `.yarnrc.yml`).
- **Orchestration**: Turborepo (`turbo`).
- **Language**: TypeScript.
- **Testing**: Vitest (`vitest`).
- **Linting**: ESLint with custom base configs.
- **Building**: `tsdown`, `tsc`, or `turbo run build`.

## Common Commands

Run these from the root:

- `yarn g:bench`: Run benchmarks for all packages.
- `yarn g:build`: Build all packages (excluding examples/docs).
- `yarn g:test-unit`: Run unit tests for all packages.
- `yarn g:test-e2e`: Run end-to-end tests for all packages.
- `yarn g:lint`: Lint the entire repository.
- `yarn g:typecheck`: Run TypeScript type checking.
- `yarn workspaces foreach -A run <script>`: Run a script in all workspaces.

## Package-Specific Development

Each package in `packages/` has its own `package.json` and local scripts:

- `yarn workspace @flowblade/<package-name> run test`: Run tests for a specific package.
- `yarn workspace @flowblade/<package-name> run test-e2e`: Run E2E tests for a specific package.
- `yarn workspace @flowblade/<package-name> run bench`: Run benchmarks for a specific package.
- `yarn workspace @flowblade/<package-name> run build`: Build a specific package.

Alternatively, you can run commands directly from the package directory:

- `cd packages/<package-name> && yarn test-unit`: Run unit tests for that package.
- `cd packages/<package-name> && yarn test-e2e`: Run E2E tests for that package.
- `cd packages/<package-name> && yarn bench`: Run benchmarks for that package.

### Reading Benchmark Outputs

Benchmarks in this repository primarily use **Vitest Bench** or **Mitata**.

#### Vitest Bench
- **hz**: Number of operations per second (higher is better).
- **mean**: Average time per operation (lower is better).
- **p75, p99, p999**: Percentile latency (lower is better).
- **rme**: Relative margin of error (lower is better).
- **Summary**: Vitest often provides a summary comparing different runs (e.g., "x is 1.34x faster than y").

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

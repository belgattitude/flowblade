# Contributing

The base branch is **`main`**.

## Workflow

> **Note**
> Please feature/fix/update... into individual PRs (not one changing everything)

- Create a [github fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo).
- On your fork, create a branch make the changes, commit and push.
- Create a pull-request.

## Checklist

If applicable:

- [x] **tests** should be included part of your PR (`pnpm g:test-unit`).
- [x] a **changeset** should be provided (`pnpm g:changeset`) to request a version bump.
- [x] **documentation** should be updated (`pnpm g:build-doc` to rebuild the api doc).

## Quick start

```bash
# make a fork and clone it, then
pnpm install
pnpm g:test-unit
pnpm g:lint
pnpm g:typecheck
```

> If pnpm is not available, enable Corepack with `corepack enable`.

## Structure

```
.
├── examples
│   │── db-sqlserver
│   │── fastify-app
│   └── nextjs-app
└── packages
    │── source-kysely
    └── (...)
```

## Local scripts

| Name                         | Description                                                                                                                               |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `pnpm g:changeset`           | Add a changeset to declare a new version                                                                                                  |
| `pnpm g:typecheck`           | Run typechecks in all workspaces                                                                                                          |
| `pnpm g:lint`                | Display linter issues in all workspaces                                                                                                   |
| `pnpm g:lint --fix`          | Attempt to run linter auto-fix in all workspaces                                                                                          |
| `pnpm g:test-unit`           | Run unit tests in all workspaces                                                                                                          |
| `pnpm g:build`               | Run build in all workspaces                                                                                                               |
| `pnpm g:clean`               | Clean builds in all workspaces                                                                                                            |
| `pnpm g:check-dist`          | Ensure build dist files passes es2017 (run `g:build` first).                                                                              |
| `pnpm g:check-size`          | Ensure build files are within size limit (run `g:build` first).                                                                           |
| `pnpm g:docgen`              | Build documentation (generally api doc)                                                                                                   |
| `pnpm g:bench`               | Run benchmarks for all workspaces.                                                                                                        |
| `pnpm clean:global-cache`    | Clean tooling caches (eslint, jest...)                                                                                                    |
| `pnpm deps:check --dep dev`  | Will print what packages can be upgraded globally (see also [.ncurc.cjs](https://github.com/belgattitude/flowblade/blob/main/.ncurc.cjs)) |
| `pnpm deps:update --dep dev` | Apply possible updates, then run `pnpm install && pnpm dedupe`.                                                                          |
| `pnpm check:install`         | Verify the lockfile and installation are in sync                                                                                          |

## Git message format

This repo adheres to the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) convention.

Commit messages are enforced through [commitlint](https://github.com/conventional-changelog/commitlint) and [a husky](https://github.com/typicode/husky) [commit-msg](https://github.com/belgattitude/flowblade/blob/main/.husky/commit-msg) hook.

### Activated prefixes

- **chore**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **lint**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests
- **translation**: Adding missing translations or correcting existing ones
- **revert**: When reverting a commit
- **style**: A change that affects the scss, less, css styles
- **release**: All related to changeset (pre exit...)

> **Note**
> Up-to-date configuration can be found in [commitlint.config.jt](https://github.com/belgattitude/flowblade/blob/main/commitlint.config.ts).

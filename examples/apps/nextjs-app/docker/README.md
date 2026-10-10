## Docker

Multi-stage builds (`turbo prune` → install + build → non-root runner) served on port `3000` (`NEXTJS_APP_PORT` build arg to change it).

| Dockerfile | Compose file | Service | Image |
| --- | --- | --- | --- |
| [`Dockerfile.nodejs`](./Dockerfile.nodejs) | `docker-compose-nodejs.yml` | `app-nodejs` | `flowblade-nextjs-app-nodejs:latest` |
| [`Dockerfile.bun`](./Dockerfile.bun) | `docker-compose-bun.yml` | `app-bun` | `flowblade-nextjs-app-bun:latest` |

Requires docker compose v2 with BuildKit (default in recent Docker). Optional: [dive](https://github.com/wagoodman/dive) to debug layer sizes.

### Build and run

The build context is the **monorepo root**. Run from this directory:

```bash
cd ./examples/apps/nextjs-app/docker

docker compose -f docker-compose-nodejs.yml build   # or docker-compose-bun.yml
docker compose -f docker-compose-nodejs.yml up
docker compose -f docker-compose-nodejs.yml down

# Build both images in parallel (builds only, use compose to run)
docker buildx bake -f docker-compose-nodejs.yml -f docker-compose-bun.yml
```

### Ignore files

With BuildKit, `<Dockerfile name>.dockerignore` next to the Dockerfile is used first, otherwise the `.dockerignore` at the monorepo root:

| Build | Ignore file |
| --- | --- |
| `docker/Dockerfile.nodejs` | [`docker/Dockerfile.nodejs.dockerignore`](./Dockerfile.nodejs.dockerignore) |
| `docker/Dockerfile.bun` | [`docker/Dockerfile.bun.dockerignore`](./Dockerfile.bun.dockerignore) (symlink to the one above) |
| any other Dockerfile | `.dockerignore` at the monorepo root |

> [!IMPORTANT]
>
> - Files **replace** each other, they are not merged: keep them in sync with the root `.dockerignore`. The two Dockerfiles share the same rules (symlink).
> - `docker/.dockerignore` is **never read** (wrong name for this context).
> - The legacy builder (`DOCKER_BUILDKIT=0`) only reads the root file.

The app `data` folder is ignored (see below, only `data/docker` is committed), along with `node_modules`, caches, tests, docs and `.git`.

### DuckDB extensions

`scripts/install-duck-extensions.ts` installs them in `data/duckdb/extensions` (`DUCKDB_EXTENSION_DIRECTORY` in `.env`) and writes a `duckdb-extensions-manifest.json` next to it. As `data` is ignored, **they are not in the image** and the Dockerfiles do not run the script: run it at build time or mount a volume and point `DUCKDB_EXTENSION_DIRECTORY` to it.

### Useful commands

```bash
# Shell in the container
docker compose -f docker-compose-nodejs.yml run --rm app-nodejs sh

# Build both images (sequentially), compare their sizes and write the committed
# data/docker/docker-images-manifest.json
pnpm docker:compare

# Skip the builds: compares the existing images, fails if one is missing
pnpm docker:compare --skip-build

# Layer sizes
dive flowblade-nextjs-app-nodejs:latest

# Export size (+/- 70M gzip, +/- 60M zstd) and move to another machine
IMAGE=flowblade-nextjs-app-nodejs
docker save ${IMAGE} | zstd > /tmp/${IMAGE}.tar.zst
docker load -i /tmp/${IMAGE}.tar.zst
```

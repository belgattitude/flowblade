ARG NODE_VERSION=26.10
ARG DEBIAN_VERSION=trixie-slim

#############################################################
# Stage 1 - Base with the monorepo tools (pnpm, turbo)      #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS base

ENV PATH="/opt/pnpm/bin:${PATH}"

# get-tool-version.ts reads tool versions from package.json (avoids installing jq)
COPY --link package.json examples/apps/nextjs-app/docker/scripts/get-tool-version.ts /opt/docker-tools/

# Install pnpm and turbo at the versions declared in the root package.json
RUN npm install -g npm \
  && PNPM_VERSION="$(node /opt/docker-tools/get-tool-version.ts pnpm /opt/docker-tools/package.json)" \
  && TURBO_VERSION="$(node /opt/docker-tools/get-tool-version.ts turbo /opt/docker-tools/package.json)" \
  && export PNPM_VERSION \
  && PNPM_HOME=/opt/pnpm SHELL=bash npx get-pnpm \
  && npm i -g "turbo@${TURBO_VERSION}"

#############################################################
# Stage 2 - App extraction / pruning                        #
#############################################################

FROM base AS prepare

WORKDIR /app

COPY --link . .

# https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN turbo prune @examples/nextjs-app --docker --out-dir=./.turbo-pruned/nextjs-app/

#############################################################
# Stage 3 - App installation and build                      #
#############################################################

# Start from base (not prepare) so the install layer only depends on the
# pruned manifests, not on every file of the monorepo.
FROM base AS builder

WORKDIR /app

# Hoisted linker will give the smallest image size. As tested with pnpm 12.6.0
# native deps like duckdb will be duplicated otherwise
# https://pnpm.io/docker#minimizing-docker-image-size-and-build-time
# PRISMA_SKIP_POSTINSTALL_GENERATE: disabling some well-known postinstall scripts
ENV TZ=Etc/UTC \
    PNPM_CONFIG_NODE_LINKER=hoisted \
    PNPM_CONFIG_PACKAGE_IMPORT_METHOD=hardlinks \
    PNPM_CONFIG_TRUST_LOCKFILE=true \
    PNPM_CONFIG_IGNORE_MANIFEST_CHECK=true \
    PNPM_CONFIG_STORE_DIR=/opt/pnpm-store \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true

# First install the dependencies (as they change less often)
COPY --link --from=prepare /app/.turbo-pruned/nextjs-app/json/ .

# Option 1: run install without cache
#RUN pnpm install --no-runtime --frozen-lockfile --ignore-manifest-check

# Option 2: run install with buildx cache mount (buildx)
RUN --mount=type=cache,target=/opt/pnpm-store,id=pnpm-cache,sharing=locked \
    pnpm install --no-runtime --frozen-lockfile --ignore-manifest-check

# Build the project (pruned full output includes .gitignore and turbo.jsonc)
COPY --link --from=prepare /app/.turbo-pruned/nextjs-app/full/ .

ENV NEXT_BUILD_IGNORE_ESLINT=true \
    NEXT_BUILD_IGNORE_TYPECHECK=true \
    NEXT_BUILD_OUTPUT=standalone \
    NODE_ENV=production

# Build, then assemble the runner files in /app/out so the runner needs a single COPY
# https://nextjs.org/docs/advanced-features/output-file-tracing
RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=warn pnpm turbo run prisma-generate --filter=@examples/db-sqlserver \
  && PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm turbo run build --filter=@examples/nextjs-app \
  && cd examples/apps/nextjs-app \
  && mv .next/standalone /app/out \
  && mv .next/static /app/out/examples/apps/nextjs-app/.next/static \
  && mv public /app/out/examples/apps/nextjs-app/public \
  && cp next.config.mjs package.json /app/out/

#############################################################
# Stage 4 - App runner                                      #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS runner

ARG NEXTJS_APP_PORT

# Both PORT / HOSTNAME envs are respected by nextjs start/dev.
ENV HOSTNAME=0.0.0.0 \
    PORT=${NEXTJS_APP_PORT:-3000} \
    TZ=Etc/UTC \
    NODE_ENV=production

# - tzdata / ca-certificates
# - For duckdb azure extension, we need to have the certs available at the
#   expected location, see https://github.com/duckdb/duckdb/discussions/9675
# - Non root user with the correct permission for prerender cache
RUN apt-get update \
  && apt-get install tzdata ca-certificates --no-install-recommends -y \
  && rm -rf /var/cache/apt/* /var/lib/apt/lists/* \
  && mkdir -p /etc/pki/tls/certs \
  && ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/.next \
  && chown nextjs:nodejs /app/.next

WORKDIR /app

USER nextjs

# Numeric ids (nextjs:nodejs) as --link doesn't resolve names from previous layers
COPY --link --from=builder --chown=1001:1001 /app/out/ ./

EXPOSE ${PORT}

CMD ["node", "examples/apps/nextjs-app/server.js"]

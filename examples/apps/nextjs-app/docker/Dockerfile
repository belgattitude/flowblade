ARG NODE_VERSION=26.9
ARG DEBIAN_VERSION=trixie-slim
ARG COREPACK_VERSION=0.35.0

#############################################################
# Stage 1 - App extraction / pruning                        #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS prepare

RUN apt-get update \
  # && apt-get install build-essential cmake curl unzip ca-certificates git jq --no-install-recommends -y \
  && apt-get install git jq wget --no-install-recommends -y \
  && rm -rf /var/cache/apt/* \
  && rm -rf /var/lib/apt/lists/* \
  && npm i -g corepack@${COREPACK_VERSION} && corepack enable


WORKDIR /app

COPY --link package.json turbo.jsonc ./

# Install Turbo at the version declared by the pruned workspace.
# both local and docker are aligned on the package.json version.
RUN TURBO_VERSION=$(cat package.json | jq '.devDependencies["turbo"]' -r) npm i -g turbo@${TURBO_VERSION}

COPY --link . .

# https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN turbo prune --scope=@examples/nextjs-app --docker --out-dir=./.turbo-pruned/nextjs-app/

#############################################################
# Stage 2 - App installation                                #
#############################################################

FROM prepare AS builder

ENV TZ=Etc/UTC

# Disabling some well-known postinstall scripts
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV HUSKY=0

WORKDIR /app

ENV pnpm_config_nodeLinker=hoisted
# https://pnpm.io/docker#minimizing-docker-image-size-and-build-time
ENV pnpm_config_package_import_method=copy
ENV pnpm_config_trust_lockfile=true

# First install the dependencies (as they change less often)
COPY --link .gitignore ./
COPY --from=prepare --link /app/.turbo-pruned/nextjs-app/json/ .
COPY --from=prepare --link /app/.turbo-pruned/nextjs-app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prepare --link /app/.turbo-pruned/nextjs-app/pnpm-workspace.yaml ./pnpm-workspace.yaml


# Option 1: run install without cache
RUN pnpm install --lockfile-only && pnpm install --frozen-lockfile

# Option 2: run install with buildx cache mount (buildx)
#RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store,sharing=locked \
#    pnpm install --frozen-lockfile

# Build the project
COPY --link --from=prepare /app/.turbo-pruned/nextjs-app/full/ .
COPY --link .gitignore turbo.jsonc tsconfig.base.json ./

ENV NEXT_BUILD_IGNORE_ESLINT=true
ENV NEXT_BUILD_IGNORE_TYPECHECK=true
ENV NEXT_BUILD_OUTPUT=standalone
ENV NODE_ENV=production
# ENV NEXT_BUILD_ENV_SENTRY_ENABLED=false
# ENV NEXT_BUILD_ENV_SENTRY_TRACING=false

RUN pnpm --filter @examples/db-sqlserver prisma-generate

RUN pnpm turbo run build --filter=@examples/nextjs-app
# Alternative we can also
#RUN pnpm turbo run build --filter=@examples/nextjs-app...

#############################################################
# Stage 3 - App runner                                      #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS runner

ARG NEXTJS_APP_PORT

# Bort PORT / HOSTNAME envs are respected by nextjs start/dev.
ENV HOSTNAME=0.0.0.0
ENV PORT=${NEXTJS_APP_PORT:-3000}
ENV TZ=Etc/UTC
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install tzdata ca-certificates --no-install-recommends -y \
  && rm -rf /var/cache/apt/* \
  && rm -rf /var/lib/apt/lists/*
  # If needed, we can enable corepack in the runner as well, but for now we don't need it  \
  # since we're running the built server.js directly with node.
  # && npm i -g corepack@${COREPACK_VERSION} && corepack enable


# For duckdb azure extension, we need to have the certs available in the runner image as well, so we link them to the expected location.
# see https://github.com/duckdb/duckdb/discussions/9675
RUN mkdir -p /etc/pki/tls/certs && ln -s /etc/ssl/certs/ca-certificates.crt /etc/pki/tls/certs/ca-bundle.crt

WORKDIR /app

# Set the correct permission for prerender cache
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir .next \
    && chown nextjs:nodejs .next

USER nextjs

COPY --from=builder --chown=nextjs:nodejs /app/examples/apps/nextjs-app/next.config.mjs \
                    /app/examples/apps/nextjs-app/package.json \
                    ./

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/examples/apps/nextjs-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/examples/apps/nextjs-app/.next/static ./examples/apps/nextjs-app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/examples/apps/nextjs-app/public ./examples/apps/nextjs-app/public

EXPOSE ${PORT}

CMD ["node", "examples/apps/nextjs-app/server.js"]

ARG NODE_VERSION=26.10
ARG DEBIAN_VERSION=trixie-slim

#############################################################
# Stage 1 - App extraction / pruning                        #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS prepare

RUN apt-get update \
  # && apt-get install build-essential cmake curl unzip ca-certificates git jq --no-install-recommends -y \
  && apt-get install jq --no-install-recommends -y

WORKDIR /app

COPY --link package.json turbo.jsonc ./

# Install pnpm at the version declared by the package manager.
RUN PNPM_VERSION=$(jq -r '.packageManager | sub("^pnpm@"; "")' package.json) PNPM_HOME=/opt/pnpm SHELL=bash npx get-pnpm
ENV PATH="/opt/pnpm/bin:${PATH}"

# Install Turbo at the version declared by the pruned workspace.
RUN TURBO_VERSION=$(jq -r '.devDependencies["turbo"]' package.json) npm i -g turbo@${TURBO_VERSION}

COPY --link . .

# https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN turbo prune @examples/nextjs-app --docker --out-dir=./.turbo-pruned/nextjs-app/

#############################################################
# Stage 2 - App installation                                #
#############################################################

FROM prepare AS builder

WORKDIR /app

ENV TZ=Etc/UTC
ENV PATH="/opt/pnpm/bin:${PATH}"
# Hoisted linker will give the smallest image size. As tested with pnpm 12.6.0
# native deps like duckdb will be duplicated otherwise
ENV PNPM_CONFIG_NODE_LINKER=hoisted
# https://pnpm.io/docker#minimizing-docker-image-size-and-build-time
ENV PNPM_CONFIG_PACKAGE_IMPORT_METHOD=copy
ENV PNPM_CONFIG_TRUST_LOCKFILE=true
ENV PNPM_CONFIG_IGNORE_MANIFEST_CHECK=true

# Disabling some well-known postinstall scripts
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# First install the dependencies (as they change less often)
COPY --link --from=prepare /app/.turbo-pruned/nextjs-app/json/ .

# Option 1: run install without cache
RUN pnpm install --no-runtime --frozen-lockfile --ignore-manifest-check

# Option 2: run install with buildx cache mount (buildx)
#RUN --mount=type=cache,target=/root/.cache/pnpm,id=pnpm-cache,sharing=locked \
#    pnpm install --trust-lockfile --no-runtime --frozen-lockfile --ignore-manifest-check

# Build the project
COPY --link .gitignore turbo.jsonc tsconfig.base.json ./
COPY --link --from=prepare /app/.turbo-pruned/nextjs-app/full/ .

RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=warn pnpm turbo run prisma-generate --filter=@examples/db-sqlserver

ENV NEXT_BUILD_IGNORE_ESLINT=true
ENV NEXT_BUILD_IGNORE_TYPECHECK=true
ENV NEXT_BUILD_OUTPUT=standalone
ENV NODE_ENV=production
# ENV NEXT_BUILD_ENV_SENTRY_ENABLED=false
# ENV NEXT_BUILD_ENV_SENTRY_TRACING=false

RUN PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm turbo run build --filter=@examples/nextjs-app

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

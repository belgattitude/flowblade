ARG NODE_VERSION=22.17
ARG DEBIAN_VERSION=bookworm-slim

#############################################################
# Stage 1 - App extraction / pruning                        #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS app-builder

#RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
#RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
#    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
RUN apt-get update \
  #&& apt-get install build-essential cmake curl unzip ca-certificates git jq --no-install-recommends -y \
  && apt-get install git jq --no-install-recommends -y \
  && corepack enable


WORKDIR /app

COPY --link package.json turbo.jsonc ./

# We can't run turbo without yarn install first, let's install locally and make sure
# both local and docker are aligned on the package.json version.
RUN TURBO_VERSION=$(cat package.json | jq '.devDependencies["turbo"]' -r) npm i -g turbo@${TURBO_VERSION}

COPY --link . .

# https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN turbo prune --scope=@examples/nextjs-app --docker --out-dir=./out/nextjs-app/

#############################################################
# Stage 2 - App installation                                #
#############################################################

FROM app-builder AS app-installer

ENV TZ=Etc/UTC

# Optimize for YARN installation speed
ENV YARN_ENABLE_GLOBAL_CACHE=false
ENV YARN_ENABLE_MIRROR=false
ENV YARN_NODE_LINKER=node-modules
ENV YARN_NM_MODE=hardlinks-local
ENV YARN_ENABLE_HARDENED_MODE=0
# If using different compression level than in local (recommended: prefer to not do this)
#ENV YARN_COMPRESSION_LEVEL 0
#ENV YARN_CHECKSUM_BEHAVIOR ignore

# Disabling some well-known postinstall scripts
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV HUSKY=0

WORKDIR /app

# First install the dependencies (as they change less often)
COPY --link .gitignore ./
COPY --from=app-builder --link /app/out/nextjs-app/json/ .
COPY --from=app-builder --link /app/out/nextjs-app/yarn.lock ./yarn.lock


# Option 1: run install without cache
#RUN yarn install --inline-builds

# Option 2: run install with buildx cache mount (buildx)
RUN --mount=type=cache,target=/root/.yarn3-cache,id=yarn3-cache \
    YARN_CACHE_FOLDER=/root/.yarn3-cache \
    yarn install --inline-builds

# Build the project
COPY --from=app-builder /app/out/nextjs-app/full/ .
COPY --link .gitignore turbo.jsonc tsconfig.base.json ./

ENV NEXT_BUILD_IGNORE_ESLINT=true
ENV NEXT_BUILD_IGNORE_TYPECHECK=true
ENV NEXT_BUILD_OUTPUT=standalone
# ENV NEXT_BUILD_ENV_SENTRY_ENABLED=false
# ENV NEXT_BUILD_ENV_SENTRY_TRACING=false


RUN yarn workspace @examples/db-sqlserver prisma-generate
RUN yarn turbo run build --filter=@examples/nextjs-app...

#############################################################
# Stage 3 - App runner                                      #
#############################################################

FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS app-runner

ARG NEXTJS_APP_PORT

# Bort PORT / HOSTNAME envs are respected by nextjs start/dev.
ENV HOSTNAME=0.0.0.0
ENV PORT=${NEXTJS_APP_PORT:-3000}
ENV TZ=Etc/UTC

#RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
#    --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
RUN apt-get update \
  && apt-get install bash tzdata --no-install-recommends -y \
  && corepack enable


WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

USER nextjs

COPY --from=app-installer --chown=nextjs:nodejs /app/examples/apps/nextjs-app/next.config.mjs \
                    /app/examples/apps/nextjs-app/package.json \
                    ./

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=app-installer --chown=nextjs:nodejs /app/examples/apps/nextjs-app/.next/standalone ./
COPY --from=app-installer --chown=nextjs:nodejs /app/examples/apps/nextjs-app/.next/static ./examples/apps/nextjs-app/.next/static
COPY --from=app-installer --chown=nextjs:nodejs /app/examples/apps/nextjs-app/public ./examples/apps/nextjs-app/public

EXPOSE ${PORT}

CMD ["node", "examples/apps/nextjs-app/server.js"]


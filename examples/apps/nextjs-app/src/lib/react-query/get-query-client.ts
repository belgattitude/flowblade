import type {
  DefaultError,
  QueryClient as QueryClientType,
  QueryKey,
  QueryOptions,
  QueryState,
  WithRequired,
} from "@tanstack/react-query";
import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import { queryClientConfig } from "@/config/react-query.config";

/**
 * Server-only cache that forces `gcTime: Infinity` on every query, including
 * those with a per-hook `gcTime` (TanStack keeps the max of all values seen,
 * so a query built with `Infinity` can never get a finite timer back).
 *
 * Without it, each query built during SSR schedules a GC `setTimeout`, which is a GC root
 * holding the finished request alive (via AsyncLocalStorage) until it fires.
 * @see https://rohitpotato.xyz/thoughts/ssr-requests-still-alive
 */
export class ServerQueryCache extends QueryCache {
  override build<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    client: QueryClientType,
    options: WithRequired<
      QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
      "queryKey"
    >,
    state?: QueryState<TData, TError>
  ) {
    return super.build(
      client,
      { ...options, gcTime: Number.POSITIVE_INFINITY },
      state
    );
  }
}

export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    ...queryClientConfig,
    defaultOptions: {
      ...queryClientConfig.defaultOptions,
      dehydrate: {
        // Also dehydrate pending queries so server prefetches can stream to the client
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
    queryCache: environmentManager.isServer()
      ? new ServerQueryCache()
      : undefined,
  });

let browserQueryClient: QueryClient | undefined;

/**
 * - Server: always a new client (never share data between requests).
 * - Browser: a singleton, so React discarding state when suspending during the
 *   initial mount (without a Suspense boundary above) does not recreate the client.
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */
export const getQueryClient = (): QueryClient => {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

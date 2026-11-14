import type { QueryClientConfig } from "@tanstack/react-query";
import { environmentManager } from "@tanstack/react-query";

/**
 * Shared QueryClient defaults (server and browser).
 *
 * Note: `gcTime` is `Infinity` on the server. During SSR no observer ever subscribes
 * (effects do not run), so a finite `gcTime` would start a `setTimeout` per query that
 * keeps the whole request (AsyncLocalStorage store) alive until it fires.
 * The server client is created per request, so never evicting is safe.
 * @see src/lib/react-query/get-query-client.ts
 */
const isProd = process.env.NODE_ENV === "production";
const browserGcTime = isProd ? 600_000 : 900_000;

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: environmentManager.isServer()
        ? Number.POSITIVE_INFINITY
        : browserGcTime,
      refetchOnWindowFocus: process.env.NODE_ENV === "development",
      retry: process.env.NODE_ENV === "production" ? 2 : false,
      // Must stay > 0 so data hydrated from the server is not refetched immediately on mount
      staleTime: process.env.NODE_ENV === "production" ? 600_000 : 900_000,
    },
  },
};

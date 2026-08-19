import type { QueryClientConfig } from "@tanstack/react-query";

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: process.env.NODE_ENV === "production" ? 600_000 : 900_000,
      refetchOnWindowFocus: process.env.NODE_ENV === "development",
      retry: process.env.NODE_ENV === "production" ? 2 : false,
      staleTime: process.env.NODE_ENV === "production" ? 600_000 : 900_000,
    },
  },
};

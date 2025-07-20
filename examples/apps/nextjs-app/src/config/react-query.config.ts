import type { QueryClientConfig } from '@tanstack/react-query';

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: process.env.NODE_ENV === 'production' ? 600_000 : 900_000,
      gcTime: process.env.NODE_ENV === 'production' ? 600_000 : 900_000,
      retry: process.env.NODE_ENV === 'production' ? 2 : false,
      refetchOnWindowFocus: process.env.NODE_ENV === 'development',
    },
  },
};

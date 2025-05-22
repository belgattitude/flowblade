'use client';

import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';

import {
  QueryResultDebugger,
  type SerializedQResult,
} from '@/components/devtools/QueryResultDebugger';
import { apiFetcher } from '@/config/api-fetcher.config.ts';

const useSearch = () => {
  return useQuery({
    queryKey: ['demo/duckdb/search'],
    queryFn: async (): Promise<SerializedQResult> => {
      return apiFetcher
        .get('demo/duckdb/search', {
          searchParams: {
            limit: 10_000,
          },
        })
        .json<SerializedQResult>();
    },
  });
};

export const DuckdbDemoPage: FC = () => {
  const { data, isLoading, error } = useSearch();

  if (isLoading) {
    return <p>loading</p>;
  }
  if (data) {
    return <QueryResultDebugger result={data} />;
  }
  if (error) {
    console.log(error);
  }

  return <div>error, check console</div>;
};

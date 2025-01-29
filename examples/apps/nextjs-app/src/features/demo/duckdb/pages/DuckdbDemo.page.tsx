'use client';

import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';

import {
  QueryResultDebugger,
  type SerializedQResult,
} from '@/components/devtools/QueryResultDebugger';

const useSearch = () => {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async (): Promise<SerializedQResult> => {
      const response = await fetch('/api/demo/duckdb/search');
      return await response.json();
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
    console.log(data);
  }

  return <div>error, check console</div>;
};

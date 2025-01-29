'use client';

import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import type { FC } from 'react';

import {
  QueryResultDebugger,
  type SerializedQResult,
} from '@/components/devtools/QueryResultDebugger';

const useSearch = () => {
  return useQuery({
    queryKey: ['demo/duckdb/search'],
    queryFn: async (): Promise<SerializedQResult> => {
      return await ky.get<SerializedQResult>('/api/demo/duckdb/search').json();
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

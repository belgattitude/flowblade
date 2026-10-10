"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { FC } from "react";

import { QueryResultDebugger } from "@/components/devtools/QueryResultDebugger";
import type { SerializedQResult } from "@/components/devtools/QueryResultDebugger";
import { apiFetcher } from "@/config/api-fetcher.config.ts";

const searchQueryOptions = queryOptions({
  queryFn: async (): Promise<SerializedQResult> =>
    await apiFetcher
      .get("demo/duckdb/search", {
        searchParams: {
          limit: 10_000,
        },
      })
      .json<SerializedQResult>(),
  queryKey: ["demo/duckdb/search"],
});

const useSearch = () => useQuery(searchQueryOptions);

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

"use client";

import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";

import { QueryResultDebugger } from "@/components/devtools/QueryResultDebugger";
import type { SerializedQResult } from "@/components/devtools/QueryResultDebugger";
import { apiFetcher } from "@/config/api-fetcher.config.ts";

const useSearch = () =>
  useQuery({
    queryFn: async (): Promise<SerializedQResult> =>
      apiFetcher
        .get("demo/duckdb/search", {
          searchParams: {
            limit: 10_000,
          },
        })
        .json<SerializedQResult>(),
    queryKey: ["demo/duckdb/search"],
  });

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

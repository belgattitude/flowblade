"use client";

import { QMeta } from "@flowblade/core";
import type { QError, QMetaSpan, QResult } from "@flowblade/core";
import { SqlFormatter } from "@flowblade/sql-tag-format";

import { DynamicCodeBlock } from "@/components/code/DynamicCodeBlock";
import { cn } from "@/components/utils";

export type SerializedQResult<T extends unknown[] = unknown[]> = Omit<
  QResult<T, QError>,
  "meta"
> & {
  meta: {
    spans: QMetaSpan[];
  };
};

interface Props<T extends unknown[] = unknown[]> {
  result: SerializedQResult<T>;
}

export const QueryResultDebugger = (props: Props) => {
  const { result } = props;
  const isError = result.error !== undefined;

  const { errorMsg, meta, data } = {
    data: isError ? null : result.data,
    errorMsg: isError ? result.error.message : null,
    meta: new QMeta({
      spans: result.meta?.spans ?? [],
    }),
  };

  let formattedSql: string | undefined;

  const firstSqlSpan = meta.getSpans().find((span) => span.type === "sql");
  const { sql } = firstSqlSpan ?? {};
  if (sql !== undefined) {
    const sqlFormatter = new SqlFormatter("duckdb");
    try {
      formattedSql = sqlFormatter.formatOrThrow(sql);
    } catch (error) {
      formattedSql = `Failed to format SQL ${(error as Error).message}`;
    }
  }

  return (
    <div className="m-5 p-5">
      <div className="rounded-lg bg-linear-to-r from-sky-200 to-sky-400 p-3 md:p-8 lg:p-12">
        {errorMsg !== null && (
          <div className="mb-5 border border-orange-700 bg-white p-5 text-lg font-bold text-red-500">
            {errorMsg}
          </div>
        )}
        <div
          className={cn("grid w-full grid-cols-2 gap-5", {
            "grid-cols-1": errorMsg !== null,
          })}
        >
          <div className="flex flex-col gap-5">
            {formattedSql !== undefined && (
              <DynamicCodeBlock
                filename="formatted sql"
                code={formattedSql}
                lang="sql"
              />
            )}
            <DynamicCodeBlock
              filename="meta"
              code={JSON.stringify(meta, null, 2)}
              lang="json"
            />
          </div>
          {data !== null && (
            <DynamicCodeBlock
              filename="data"
              code={JSON.stringify(
                Array.isArray(data) ? data.slice(0, 100) : data,
                null,
                2
              )}
              lang="json"
            />
          )}
        </div>
      </div>
    </div>
  );
};

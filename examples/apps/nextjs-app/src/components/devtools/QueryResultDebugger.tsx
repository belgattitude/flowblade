'use client';

import {
  type QError,
  QMeta,
  type QMetaSpan,
  type QResult,
} from '@flowblade/core';
import { SqlFormatter } from '@flowblade/sql-tag-format';

import { DynamicCodeBlock } from '@/components/code/DynamicCodeBlock';
import { cn } from '@/components/utils';

export type SerializedQResult<T extends unknown[] = unknown[]> = Omit<
  QResult<T, QError>,
  'meta'
> & {
  meta: {
    spans: QMetaSpan[];
  };
};

type Props<T extends unknown[] = unknown[]> = {
  result: SerializedQResult<T>;
};

export const QueryResultDebugger = (props: Props) => {
  const { result } = props;
  const isError = result.error !== undefined;

  const { errorMsg, meta, data } = {
    errorMsg: isError ? result.error.message : null,
    data: isError ? null : result.data,
    meta: new QMeta({
      spans: result.meta?.spans ?? [],
    }),
  };

  let formattedSql: string | undefined;

  const firstSqlSpan = meta.getSpans().find((span) => span.type === 'sql');
  const { sql } = firstSqlSpan ?? {};
  if (sql !== undefined) {
    const sqlFormatter = new SqlFormatter('postgresql');
    try {
      formattedSql = sqlFormatter.formatOrThrow(sql);
    } catch (e) {
      formattedSql = `Failed to format SQL ${(e as Error).message}`;
    }
  }

  return (
    <div className={'m-5 p-5'}>
      <div
        className={
          'rounded-lg bg-linear-to-r from-sky-200 to-sky-400 p-3 md:p-8 lg:p-12'
        }
      >
        {errorMsg !== null && (
          <div
            className={
              'border border-orange-700 text-red-500 text-lg font-bold p-5 mb-5 bg-white'
            }
          >
            {errorMsg}
          </div>
        )}
        <div
          className={cn('grid grid-cols-2 gap-5 w-full', {
            'grid-cols-1': errorMsg !== null,
          })}
        >
          <div className={'flex flex-col gap-5'}>
            {formattedSql !== undefined && (
              <DynamicCodeBlock
                filename={'formatted sql'}
                code={formattedSql}
                lang={'sql'}
              />
            )}
            <DynamicCodeBlock
              filename={'meta'}
              code={JSON.stringify(meta, null, 2)}
              lang={'json'}
            />
          </div>
          {data !== null && (
            <DynamicCodeBlock
              filename={'data'}
              code={JSON.stringify(
                Array.isArray(data) ? data.slice(0, 100) : data,
                null,
                2
              )}
              lang={'json'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

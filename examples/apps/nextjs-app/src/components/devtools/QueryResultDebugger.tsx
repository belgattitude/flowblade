'use server';

import type { QError, QResult } from '@flowblade/core';
import { format } from 'sql-formatter';

import { ShikiSSRCode } from '@/components/code/ShikiSSRCode';
import { cn } from '@/components/utils';

type Props<T extends unknown[] = unknown[]> = {
  result: QResult<T, QError>;
  dialect: 'tsql' | 'mysql' | 'plsql';
};

export const QueryResultDebugger = async (props: Props) => {
  const { result } = props;
  const isError = result.error !== undefined;

  const { errorMsg, meta, data } = {
    errorMsg: isError ? result.error.message : null,
    data: isError ? null : result.data,
    meta: result.meta,
  };

  let formattedSql: string | undefined;
  const firstSqlSpan = meta?.getSpans().find((span) => span.type === 'sql');
  const sql = firstSqlSpan === undefined ? undefined : firstSqlSpan.sql;
  if (sql !== undefined) {
    try {
      formattedSql = format(sql, { language: 'postgresql' });
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
            <ShikiSSRCode
              filename={'meta'}
              code={JSON.stringify(meta, null, 2)}
              lang={'json'}
            />
            {formattedSql !== undefined && (
              <ShikiSSRCode
                filename={'formatted sql'}
                code={formattedSql}
                lang={'sql'}
              />
            )}
          </div>
          {data !== null && (
            <ShikiSSRCode
              filename={'data'}
              code={JSON.stringify(data, null, 2)}
              lang={'json'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

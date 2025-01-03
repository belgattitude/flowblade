import { Result } from 'typescript-result';

import type { QueryResultMeta } from '../data-source/query-result';

export type PerformanceSpan = {
  name: string;
  timeMs: number;
};

export class QMeta {
  constructor(public meta: QueryResultMeta) {}
  performanceSpans: PerformanceSpan[] = [];
  addSpan = (performanceSpan: PerformanceSpan) => {
    this.performanceSpans.push(performanceSpan);
  };
  withAddedPerformanceSpan = (performanceSpan: PerformanceSpan) => {
    const meta = new QMeta(this.meta);
    meta.addSpan(performanceSpan);
    return meta;
  };
}

export type QError = {
  message: string;
};

export class QResult<
  TData extends unknown[] | undefined,
  TError extends QError | undefined,
> {
  result: Result<
    {
      rows: TData;
      meta: QMeta;
    },
    TError
  >;

  constructor(
    public meta: QMeta,
    public data?: TData | undefined,
    public error?: TError | undefined
  ) {
    this.result =
      error === undefined
        ? Result.ok({
            meta: this.meta,
            rows: this.data!,
          })
        : Result.error(error);
  }
  transform = <ReturnType>(
    transform: (row: NonNullable<TData>[number]) => ReturnType
  ) => {
    const start = performance.now();
    if (this.result.isOk()) {
      const result = this.result.map((value) => {
        return {
          meta: this.meta,
          rows: value.rows!.map((row) => transform(row)),
        };
      });
      const timeMs = performance.now() - start;

      const newMeta = this.meta.withAddedPerformanceSpan({
        name: 'transform',
        timeMs: timeMs,
      });
      new QResult(newMeta, result.value.rows, undefined);
    }
    return new QResult(this.meta, undefined, this.result.error);
  };
}

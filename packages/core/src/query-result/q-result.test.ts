import { expectTypeOf } from 'vitest';

import { QMeta, type QMetaSqlSpan } from '../meta/q-meta';
import { QResult } from './q-result';

describe('QResult', () => {
  const initialSqlSpan: QMetaSqlSpan = {
    type: 'sql',
    timeMs: 10.334,
    sql: 'SELECT name FROM users',
    affectedRows: 10,
    params: [],
  };

  const createSuccessResult = () =>
    new QResult({
      error: undefined,
      data: [
        {
          name: 'Sébastien',
        },
        {
          name: 'Damien',
        },
      ],
      meta: new QMeta({
        spans: initialSqlSpan,
      }),
    });

  describe('map', () => {
    describe('when a result is success', () => {
      const successResult = createSuccessResult();
      it('should apply transformation with updated metadata', () => {
        const result = successResult.map((row) => {
          return {
            name: row.name.length,
            capitalized: row.name.toUpperCase(),
          };
        });
        expect(result.isOk()).toBe(true);
        const { meta, data } = result;
        expect(meta.getSpans().length).toBe(2);
        expect(meta.getTotalTimeMs()).toBeGreaterThan(initialSqlSpan.timeMs);
        expect(data).toStrictEqual([
          {
            capitalized: 'SÉBASTIEN',
            name: 9,
          },
          {
            capitalized: 'DAMIEN',
            name: 6,
          },
        ]);
        expectTypeOf(data!).toEqualTypeOf<
          {
            name: number;
            capitalized: string;
          }[]
        >();
      });
    });
  });
});

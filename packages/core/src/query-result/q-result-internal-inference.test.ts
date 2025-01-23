import { expectTypeOf } from 'vitest';

import { QMeta, type QMetaSqlSpan } from '../meta/q-meta';
import { QResult } from './q-result';
import type { QError } from './types';

describe('QResult internal inference test', () => {
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

  describe('$inferData', () => {
    describe('when a result is success', () => {
      it('should return the type of data', () => {
        const successResult = createSuccessResult();
        expectTypeOf(successResult.$inferData).toEqualTypeOf<
          {
            name: string;
          }[]
        >();
      });
      describe('when a result is an error', () => {
        it('should return undefined', () => {
          const errorResult = new QResult({
            data: undefined,
            error: {
              message: 'Error',
            },
            meta: new QMeta({
              spans: initialSqlSpan,
            }),
          });
          expectTypeOf(errorResult.$inferData).toEqualTypeOf<undefined>();
        });
      });
    });

    describe('$inferError', () => {
      describe('when a result is success', () => {
        it('should return undefined', () => {
          const successResult = createSuccessResult();
          expectTypeOf(successResult.$inferError).toEqualTypeOf<undefined>();
        });
        describe('when a result is an error', () => {
          it('should return QError', () => {
            const errorResult = new QResult({
              data: undefined,
              error: {
                message: 'Error',
              },
              meta: new QMeta({
                spans: initialSqlSpan,
              }),
            });
            expectTypeOf(errorResult.$inferError).toEqualTypeOf<QError>();
          });
        });
      });
    });
  });
});

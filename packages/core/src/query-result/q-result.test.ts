import { expectTypeOf } from 'vitest';

import {
  QMeta,
  type QMetaJsonifiable,
  type QMetaSqlSpan,
} from '../meta/q-meta';
import { QResult } from './q-result';
import type { QError } from './types';

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
      data: [{ name: 'Sébastien' }],
      meta: new QMeta({ spans: initialSqlSpan }),
    });

  const createErrorResult = () =>
    new QResult<{ name: string }[], QError>({
      error: {
        message: 'An error occurred',
      },
      meta: new QMeta({ spans: initialSqlSpan }),
    });

  describe('Constructor', () => {
    describe('With a success result', () => {
      const successResult = createSuccessResult();
      it('should type the data as optional', () => {
        expectTypeOf(successResult.data).toEqualTypeOf<
          { name: string }[] | undefined
        >();
      });
      it('should type the error as optional', () => {
        expectTypeOf(successResult.error).toEqualTypeOf<QError | undefined>();
      });
      it('should type the meta as required', () => {
        expectTypeOf(successResult.meta).toEqualTypeOf<QMeta>();
      });
    });
    describe('When  dereferencing the result', () => {
      const arbitraryResult = new QResult({
        data: [{ name: 'Seb' }],
        meta: new QMeta({
          spans: initialSqlSpan,
        }),
      }) as QResult<{ name: string }[], QError>;

      it('should to remove undefined', () => {
        const { data, error } = arbitraryResult;
        if (data) {
          expectTypeOf(data).toEqualTypeOf<
            {
              name: string;
            }[]
          >();
        }
        if (error) {
          expectTypeOf(error).toEqualTypeOf<QError>();
        }
      });
    });
    describe('With a error result', () => {
      const errorResult = new QResult<{ name: string }[], QError>({
        error: {
          message: 'error',
        },
        meta: new QMeta({
          spans: initialSqlSpan,
        }),
      });
      it('should type the data as optional', () => {
        expectTypeOf(errorResult.data).toEqualTypeOf<
          { name: string }[] | undefined
        >();
      });
      it('should type the error as optional', () => {
        expectTypeOf(errorResult.error).toEqualTypeOf<QError | undefined>();
      });
      it('should type the meta as required', () => {
        expectTypeOf(errorResult.meta).toEqualTypeOf<QMeta>();
      });
    });
  });

  describe('toJsonifiable', () => {
    describe('when a result is success', () => {
      it('should return a jsonifiable success paybload', () => {
        const result = createSuccessResult();
        const jsonifiable = result.toJsonifiable();
        expect(jsonifiable).toStrictEqual({
          data: [{ name: 'Sébastien' }],
          meta: {
            spans: [initialSqlSpan],
          },
        });
        expectTypeOf(jsonifiable).toEqualTypeOf<{
          data?: { name: string }[] | undefined;
          error?: QError;
          meta: QMetaJsonifiable;
        }>();
      });
    });
    describe('when a result is an error', () => {
      it('should return a jsonifiable error payload', () => {
        const result = createErrorResult();
        const jsonifiable = result.toJsonifiable();
        expect(jsonifiable).toStrictEqual({
          error: {
            message: 'An error occurred',
          },
          meta: {
            spans: [initialSqlSpan],
          },
        });
        expectTypeOf(jsonifiable).toEqualTypeOf<{
          data?: { name: string }[] | undefined;
          error?: QError;
          meta: QMetaJsonifiable;
        }>();
      });
    });
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
        ]);
        expectTypeOf(data).toEqualTypeOf<
          | {
              name: number;
              capitalized: string;
            }[]
          | undefined
        >();
      });
    });
  });
});

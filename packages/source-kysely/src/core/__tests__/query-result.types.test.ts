import { expectTypeOf } from 'vitest';

import { assertQueryResultSuccess } from '../assert';
import type {
  AsyncQueryResult,
  InferAsyncQueryResultData,
  InferQueryResultData,
  QueryResult,
} from '../query-result';

describe('QueryResult types tests', () => {
  describe('InferQueryResultData', () => {
    it('should properly infer the success data of a QueryResult', () => {
      type Row = { id: number };
      const queryResult: QueryResult<Row[]> = {
        success: true,
        data: [{ id: 1 }],
      };
      type TData = InferQueryResultData<typeof queryResult>;
      assertQueryResultSuccess(queryResult);
      expectTypeOf(queryResult.data).toEqualTypeOf<TData>;
    });
  });

  describe('InferAsyncQueryResultData', () => {
    it('should properly infer the success data of an AsyncQueryResult', async () => {
      type Row = { id: number };
      const getQueryResult = async (): AsyncQueryResult<Row[]> => {
        return {
          success: true,
          data: [{ id: 1 }],
        };
      };
      type TData = InferAsyncQueryResultData<ReturnType<typeof getQueryResult>>;
      const result = await getQueryResult();
      assertQueryResultSuccess(result);
      const data: TData = [{ id: 1 }];
      expectTypeOf(result.data).toEqualTypeOf<typeof data>;
    });
  });
});

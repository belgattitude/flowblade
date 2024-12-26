import { describe } from 'vitest';

import { assertQueryResultSuccess, isQueryResultSuccess } from '../assert';
import type { QueryResult } from '../query-result';

describe('assert tests', () => {
  describe('isQueryResultSuccess', () => {
    it('should return true if result is a success', () => {
      type Row = { id: number };
      const result: QueryResult<Row[]> = {
        success: true,
        data: [{ id: 1 }],
      };
      expect(isQueryResultSuccess(result)).toBe(true);
    });
  });
  describe('assertQueryResultSuccess', () => {
    it('should not throw if result is a success', () => {
      type Row = { id: number };
      const result: QueryResult<Row[]> = {
        success: true,
        data: [{ id: 1 }],
      };
      expect(() => assertQueryResultSuccess(result)).not.toThrow();
      assertQueryResultSuccess(result);
      expectTypeOf(result.data?.[0]!.id).toEqualTypeOf<number>;
    });
  });
});

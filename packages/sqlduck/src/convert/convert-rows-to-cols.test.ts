import { describe, expect, it } from 'vitest';

import { convertRowsToCols } from './convert-rows-to-cols';

describe('convertRowsToCols', () => {
  it('converts array of row objects to column arrays (example case)', () => {
    const columns = convertRowsToCols([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(columns).toStrictEqual([
      [1, 2],
      ['Alice', 'Bob'],
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(convertRowsToCols([])).toStrictEqual([]);
  });

  it('uses first row keys order and fills missing/undefined values with null', () => {
    const columns = convertRowsToCols<
      ArrayElement<
        [
          { a: number; b?: never },
          { b: number; a?: never },
          { a?: undefined; b: number },
        ]
      >
    >([{ a: 1 }, { b: 2 }, { a: undefined, b: 3 }]);

    // First row keys => ['a'] only
    expect(columns).toStrictEqual([[1, null, null]]);
  });

  it('supports generator/iterable input for streaming scenarios', () => {
    function* gen() {
      yield { id: 1, name: 'Alice' };
      yield { id: 2, name: 'Bob' };
    }
    const columns = convertRowsToCols(gen());
    expect(columns).toStrictEqual([
      [1, 2],
      ['Alice', 'Bob'],
    ]);
  });
});

// Helper type to extract array element type
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

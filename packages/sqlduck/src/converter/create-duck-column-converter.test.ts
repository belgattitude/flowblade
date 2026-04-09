import { BIGINT } from '@duckdb/node-api';

import { createDuckColumnConverters } from './create-duck-column-converters.ts';

describe('createDuckColumnConverter', () => {
  const colDef = {
    one: BIGINT,
  } as const;

  it('should create a converter', () => {
    const map = createDuckColumnConverters(colDef);
    const converter = map.get('one')!;
    expect(converter).toBeInstanceOf(Function);
    expect(converter(10n)).toBe('10');
  });
});

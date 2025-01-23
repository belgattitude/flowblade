import { sql } from '@flowblade/sql-tag';
import { expectTypeOf } from 'vitest';

import { DummyDatasource } from '../testing/dummy-datasource';
import type { InferQResult } from './infer-q-result';

describe('InferQResult', () => {
  it('should work', async () => {
    type Row = {
      id: string;
      name: string;
    };

    const getSqlUsers = () => sql<Row>`SELECT id, name FROM users`;

    const ds = new DummyDatasource({ connection: null });
    const result = await ds.query(getSqlUsers());

    type InferredData = InferQResult<typeof result>;
    const _a: InferredData = [{ id: '1', name: 'Sébastien' }];

    expectTypeOf(result.data!).toEqualTypeOf<Row[]>();
    expectTypeOf(result.data!).toEqualTypeOf<InferredData>();
  });
});

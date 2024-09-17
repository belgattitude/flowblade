import { type AliasedRawBuilder, sql } from 'kysely';
import { expect } from 'vitest';

import type { IColumnModel } from '../../column-model/IColumnModel';
import { KyselyHelpers } from '../KyselyHelpers';

describe('KyselyHelpers', () => {
  describe('getSelectColsFromCm', () => {
    const columnModel = {
      id: {
        type: 'string',
        nullable: false,
      },
      permissions: {
        type: 'string',
      },
      computedCurrentDate: {
        type: 'string',
        nullable: true,
      },
    } as const satisfies IColumnModel;

    it('should return a strongly typed array of column names (no aliases)', () => {
      const selectCols = KyselyHelpers.getSelectColsFromCm({ columnModel });
      expect(selectCols).toStrictEqual([
        'id',
        'permissions',
        'computedCurrentDate',
      ]);
      expectTypeOf<string[]>(selectCols);
      expectTypeOf<('id' | 'permissions' | 'computedCurrentDate')[]>(
        selectCols
      );
    });

    it('should properly support raw aliases', () => {
      const aliased = sql<string>`CURRENT_TIMESTAMP`.as('computedCurrentDate');

      const columns = KyselyHelpers.getSelectColsFromCm({
        columnModel,
        rawAliases: {
          computedCurrentDate: aliased,
        },
      });
      expect(columns).toStrictEqual(['id', 'permissions', aliased]);
      expectTypeOf<(string | AliasedRawBuilder)[]>(columns);
      expectTypeOf<('id' | 'permissions' | AliasedRawBuilder)[]>(columns);
    });
  });
});

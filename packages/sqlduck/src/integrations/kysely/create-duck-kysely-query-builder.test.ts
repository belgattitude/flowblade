import { duckdb as duckDbDialect, formatDialect } from 'sql-formatter';
import { describe, expectTypeOf } from 'vitest';
import type * as z from 'zod';

import type { testFullSupportedColumnsZodSchema } from '@/tests/data/test-full-supported-columns-zod-schema.ts';

import { createDuckKysekyQueryBuilder } from './create-duck-kysely-query-builder.ts';

describe('createDuckKysekyQueryBuilder', () => {
  it('should work', async () => {
    type Database = {
      full_schema: z.output<typeof testFullSupportedColumnsZodSchema>;
    };
    const eb = createDuckKysekyQueryBuilder<Database>({
      schema: 'read_only_schema',
    });
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const query = eb
      .selectFrom('full_schema')
      .select([
        'id',
        'name',
        'email',
        'js_number',
        'js_number_tinyint',
        'js_number_int32',
        'js_float_float32',
        'js_float_float64',
        'bignumber',
        'created_at',
        'is_active',
        'alt_uuid_v7',
        // 'custom_type',
        // 'js_enum',
      ])
      .where((eb) => {
        return eb.or([
          eb('id', '=', 1),
          eb('name', 'ilike', '%cool%'),
          eb('name', 'in', ['Alice', 'Bob']),
          eb('is_active', '=', true),
          eb('js_enum', '=', 'a'),
          eb('created_at', '>', createdAt.toISOString()),
        ]);
      })
      .limit(3);

    const { sql, parameters } = query.compile();
    expect(parameters).toStrictEqual([
      1,
      '%cool%',
      'Alice',
      'Bob',
      true,
      'a',
      createdAt.toISOString(),
      3,
    ]);
    const formattedSql = formatDialect(sql, {
      dialect: duckDbDialect,
      useTabs: false,
      tabWidth: 2,
    });
    const expected = `
         select
          "id",
          "name",
          "email",
          "js_number",
          "js_number_tinyint",
          "js_number_int32",
          "js_float_float32",
          "js_float_float64",
          "bignumber",
          "created_at",
          "is_active",
          "alt_uuid_v7"
      from "read_only_schema"."full_schema"
      where
      (
        "id" = $1
        or "name" ilike $2
        or "name" in ($3, $4)
        or "is_active" = $5
        or "js_enum" = $6
        or "created_at" > $7
      )
    limit $8
  `;

    expect(formattedSql).toStrictEqual(
      formatDialect(expected, {
        dialect: duckDbDialect,
        useTabs: false,
        tabWidth: 2,
      })
    );
    const result = await query.executeTakeFirst();

    expectTypeOf(result!).toEqualTypeOf<{
      id: number;
      name: string;
      email: string | null;
      js_number: number;
      js_number_tinyint: number;
      js_number_int32: number;
      js_float_float32: number;
      js_float_float64: number;
      bignumber: string | null;
      created_at: string;
      is_active: boolean | null;
      alt_uuid_v7: string;
    }>();
  });
});

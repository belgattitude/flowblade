import * as z from 'zod';

import { ensureZodTableSchema } from './ensure-zod-table-schema.ts';

describe('createZodTableSchema', () => {
  type Row = {
    aNumber: number;
    aString: string;
    aNullableNumber: number | null;
    aNullableString: string | null;
    aBoolean: boolean;
    aNullableBoolean: boolean | null;
    aDate: Date;
    aNullableDate: Date | null;
  };
  const row: Row = {
    aNumber: 1,
    aString: 'a',
    aNullableNumber: null,
    aNullableString: null,
    aBoolean: true,
    aNullableBoolean: null,
    aDate: new Date(),
    aNullableDate: null,
  };
  it('a compatible schema wil pass', () => {
    const _validSchema = ensureZodTableSchema<Row>(
      z.strictObject({
        aNumber: z.number(),
        aString: z.string(),
        aNullableNumber: z.nullable(z.number()),
        aNullableString: z.nullable(z.string()),
        aBoolean: z.boolean(),
        aNullableBoolean: z.nullable(z.boolean()),
        aDate: z.date(),
        aNullableDate: z.nullable(z.date()),
      })
    );

    type TSchema = z.infer<typeof _validSchema>;
    expectTypeOf(row).toEqualTypeOf<TSchema>();
  });

  it('should require explicit generic T', () => {
    const _noGeneric = ensureZodTableSchema(
      // @ts-expect-error - without explicit generic, defaults to RequireExplicitGeneric which no schema satisfies
      z.strictObject({
        aNumber: z.number(),
        aString: z.string(),
      })
    );
  });

  it('should reject schema with missing keys', () => {
    const _missingKeys = ensureZodTableSchema<Row>(
      // @ts-expect-error - missing aNullableNumber and other keys
      z.strictObject({
        aNumber: z.number(),
        aString: z.string(),
      })
    );
  });

  it('should reject schema with wrong value types', () => {
    const _wrongType = ensureZodTableSchema<Row>(
      // @ts-expect-error - aNumber should be z.number(), not z.string()
      z.strictObject({
        aNumber: z.string(),
        aString: z.string(),
        aNullableNumber: z.nullable(z.number()),
        aNullableString: z.nullable(z.string()),
        aBoolean: z.boolean(),
        aNullableBoolean: z.nullable(z.boolean()),
        aDate: z.date(),
        aNullableDate: z.nullable(z.date()),
      })
    );
  });
});

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
    const validSchema = ensureZodTableSchema<Row>(
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

    type TSchema = z.infer<typeof validSchema>;
    expectTypeOf(row).toEqualTypeOf<TSchema>();
  });
});

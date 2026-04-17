import * as z from 'zod';

import { ensureZodTableSchema } from './ensure-zod-table-schema.ts';

describe('createZodTableSchema', () => {
  type UserRow = {
    aNumber: number;
    aString: string;
    aNullableNumber: number | null;
    aNullableString: string | null;
    aBoolean: boolean;
    aNullableBoolean: boolean | null;
    aDate: Date;
    aNullableDate: Date | null;
  };
  it('a compatible schema wil pass', () => {
    const _userSchema = ensureZodTableSchema<UserRow>(
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
  });
});

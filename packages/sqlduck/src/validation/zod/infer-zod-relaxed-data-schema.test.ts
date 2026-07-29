import { expectTypeOf } from 'vitest';
import * as z from 'zod';

import type { InferZodRelaxedDataSchema } from './infer-zod-relaxed-data-schema.ts';

describe('InferZodRelaxedDataSchema', () => {
  it('should add string to date field', () => {
    const _userSchema = z.strictObject({
      id: z.string(),
      age: z.number(),
      createdAt: z.date(), // Native Date
      createdAtNullable: z.nullable(z.date()), // Native Date
      updatedAt: z.iso.date(), // Custom Codec
    });

    const record: InferZodRelaxedDataSchema<typeof _userSchema> = {
      createdAt: new Date(),
      createdAtNullable: new Date(),
      age: 10,
      updatedAt: new Date().toISOString(),
      // updatedAt: new Date(),
      id: 'xxx',
    };

    expectTypeOf(record).toMatchObjectType<{
      createdAt: Date | string;
      createdAtNullable: Date | string | null;
      age: number;
      updatedAt: Date | string;
      id: string;
    }>();
  });
});

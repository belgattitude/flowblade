import * as z from 'zod';

import { zodCodecs } from '../../src/utils/zod-codecs.ts';

/**
 * A full set of supported columns for testing purposes.
 */
export const testFullSupportedColumnsZodSchema = z.object({
  id: z.number().meta({ primaryKey: true }),
  name: z.string(),
  email: z.email().nullable(),
  js_number: z.number(),
  js_number_int32: z.int32(),
  js_float_float64: z.float64(),
  js_float_float32: z.float32(),
  // js_bigint: z.bigint(),
  // js_unsigned_bigint: z.bigint().positive(),
  bignumber: z.nullable(zodCodecs.bigintToString),
  created_at: zodCodecs.dateToString,
  is_active: z.nullable(z.boolean()),
  alt_uuid_v7: z.uuidv7(),
  custom_type: z.string().meta({
    duckdbType: 'UUID',
  }),
  /*
  text_json: z.object({
    name: z.string(),
    age: z.number(),
  }) */
});

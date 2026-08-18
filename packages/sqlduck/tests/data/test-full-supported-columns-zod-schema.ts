import * as z from 'zod';

import { zodCodecs } from '../../src/utils/zod-codecs.ts';

/**
 * A full set of supported columns for testing purposes.
 */
export const testFullSupportedColumnsZodSchema = z.strictObject({
  id: z.number().meta({ primaryKey: true }),
  name: z.string(),
  email: z.email().nullable(),
  js_number: z.number(),
  js_number_tinyint: z.number().int().min(-128).max(127),
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
  custom_date_only_type: z.string().meta({
    duckdbType: 'DATE',
  }),
  iso_date: z.iso.date(),
  js_enum: z.enum(['a', 'b', 'c']),
  decimal_18_3: z.float32().meta({
    multipleOf: 0.001,
  }),
  list_of_strings_explicit: z.array(z.string()).meta({
    duckdbType: 'VARCHAR[]',
  }),
  list_of_strings: z.array(z.string()),
  list_of_bigints: z.array(zodCodecs.bigintToString),
  list_of_bigints_explicit: z.array(zodCodecs.bigintToString).meta({
    duckdbType: 'BIGINT[]',
  }),
  list_of_numbers: z.array(z.number()),
  list_of_int32s: z.array(z.int32()),
  list_of_booleans: z.array(z.boolean()),
  list_of_float32s: z.array(z.float32()),
  list_of_float64s: z.array(z.float64()),
});

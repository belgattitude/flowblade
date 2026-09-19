import isInCi from "is-in-ci";
import { type BenchCompareOptions, test } from "vitest";
import * as z from "zod";

import { getTableCreateFromZod, Table, zodCodecs } from "../src";

const benchConfig: BenchCompareOptions = {
  iterations: isInCi ? 1 : 2,
  warmupIterations: isInCi ? 1 : 1,
  throws: true,
};

test(`Bench getTableCreateFromZod`, async ({ bench }) => {
  const userSchema = z.object({
    id: z.number().meta({ primaryKey: true }),
    name: z.string(),
    email: z.email().nullable(),
    js_number: z.number(),
    js_number_int32: z.int32(),
    js_float_float64: z.float64(),
    js_float_float32: z.float32(),
    bignumber: z.nullable(zodCodecs.bigintToString),
    created_at: zodCodecs.dateToString,
    is_active: z.nullable(z.boolean()),
    alt_uuid_v7: z.uuidv7(),
  });

  await bench(`getTableCreateFromZod`, benchConfig, () => {
    const _result = getTableCreateFromZod({
      table: new Table("test_table"),
      schema: userSchema,
    });
  }).run();
});

import { expectTypeOf, describe, it } from "vitest";
import * as z from "zod";

import { zodCodecs } from "../../utils/zod-codecs.ts";
import type { InferZodRelaxedDataSchema } from "./infer-zod-relaxed-data-schema.ts";

describe("InferZodRelaxedDataSchema", () => {
  it("should add string to date field", () => {
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
      id: "xxx",
    };

    expectTypeOf(record).toMatchObjectType<{
      createdAt: Date | string;
      createdAtNullable: Date | string | null;
      age: number;
      updatedAt: Date | string;
      id: string;
    }>();
  });

  it("should accept the input and output types of codecs only", () => {
    const _schema = z.strictObject({
      big: zodCodecs.bigintToString,
      bigNullable: z.nullable(zodCodecs.bigintToString),
      coerced: z.coerce.number(),
      piped: z.string().pipe(z.string()),
    });
    expectTypeOf<InferZodRelaxedDataSchema<typeof _schema>>().toEqualTypeOf<{
      big: bigint | string;
      bigNullable: bigint | string | null;
      // not unknown: z.coerce input is unknown
      coerced: number;
      piped: string;
    }>();
  });
});

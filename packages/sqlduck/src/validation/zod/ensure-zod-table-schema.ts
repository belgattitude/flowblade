import type * as z from 'zod';

type TObject = Record<
  string,
  string | number | null | undefined | boolean | Date
>;

declare const EXPLICIT_GENERIC_REQUIRED: unique symbol;
type RequireExplicitGeneric = TObject & { [EXPLICIT_GENERIC_REQUIRED]: never };

/**
 * Helper to ensure a zod table schema is compatible with the provided type definition
 *
 * @example
 * ```typescript
 * import { ensureZodTableSchema } from '@flowblade/sqlduck/zod';
 *
 * type Row = {
 *   aNumber: number;
 *   aString: string;
 *   aNullableNumber: number | null;
 *   aNullableString: string | null;
 *   aBoolean: boolean;
 *   aNullableBoolean: boolean | null;
 *   aDate: Date;
 *   aNullableDate: Date | null;
 * };
 *
 * const schema = ensureZodTableSchema<Row>(z.strictObject({
 *  aNumber: z.number(),
 *  aString: z.string(),
 *  aNullableNumber: z.nullable(z.number()),
 *  aNullableString: z.nullable(z.string()),
 *  aBoolean: z.boolean(),
 *  aNullableBoolean: z.nullable(z.boolean()),
 *  aDate: z.date(),
 *  aNullableDate: z.nullable(z.date()),
 * }));
 *
 * ```
 */
export const ensureZodTableSchema = <
  T extends TObject = RequireExplicitGeneric,
>(
  schema: z.ZodObject<{ [K in keyof NoInfer<T>]-?: z.ZodType<NoInfer<T>[K]> }>
) => {
  return schema;
};

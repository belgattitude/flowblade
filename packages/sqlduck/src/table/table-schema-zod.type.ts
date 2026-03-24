import type * as z from 'zod';

export type ZodSchemaSupportedTypes =
  | z.ZodString
  | z.ZodNumber
  | z.ZodInt
  | z.ZodInt32
  | z.ZodUInt32
  | z.ZodBigInt
  | z.ZodBoolean
  | z.ZodDate
  | z.ZodISODateTime
  | z.ZodISOTime
  | z.ZodISODate
  | z.ZodEmail
  | z.ZodURL
  | z.ZodUUID
  | z.ZodCUID
  | z.ZodCUID2
  | z.ZodULID;

export type TableSchemaZod = z.ZodObject<
  Record<
    string,
    | ZodSchemaSupportedTypes
    | z.ZodNullable<ZodSchemaSupportedTypes>
    | z.ZodCodec
    | z.ZodNullable<z.ZodCodec>
  >
>;

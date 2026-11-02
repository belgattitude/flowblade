import type * as z from "zod";

// 2. Recursive checker analyzing schema elements according to Zod v4 internal types
type MapRelaxedZodSchemaField<T extends z.ZodType> =
  // Identify ZodDate
  T extends z.ZodDate
    ? string | Date
    : // Identify your custom ZodIsoDate codec / brand
      T extends z.ZodISODate
      ? string | Date
      : // Unwrap Optional modifiers safely via Zod v4's internal '_def' footprint
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        T extends z.ZodOptional<any>
        ? MapRelaxedZodSchemaField<T["_def"]["innerType"]> | undefined
        : // Unwrap Nullable modifiers safely via Zod v4's internal '_def' footprint
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          T extends z.ZodNullable<any>
          ? MapRelaxedZodSchemaField<T["_def"]["innerType"]> | null
          : // Codecs accept their input (ie: bigint) or output (ie: string)
            // type. Only codecs: the input of other schemas can be `unknown`
            // (ie: z.coerce, z.preprocess).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            T extends z.ZodCodec<any, any>
            ? z.input<T> | z.output<T>
            : // Fallback for primitive schemas (strings, numbers, booleans, arrays)
              z.output<T>;

/**
 * Relaxed row type of a schema: Date properties accept `Date | string`, and
 * codecs accept both their input and output types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferZodRelaxedDataSchema<T extends z.ZodObject<any>> = {
  [K in keyof T["shape"]]: MapRelaxedZodSchemaField<T["shape"][K]>;
};

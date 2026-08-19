import type * as z from "zod";

// 2. Recursive checker analyzing schema elements according to Zod v4 internal types
type MapRelaxedZodSchemaField<T extends z.ZodTypeAny> =
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
          : // Fallback for primitive schemas (strings, numbers, booleans, arrays)
            z.infer<T>;

/**
 * Add string type to all Date properties so it makes it an union between
 * Date | string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferZodRelaxedDataSchema<T extends z.ZodObject<any>> = {
  [K in keyof T["shape"]]: MapRelaxedZodSchemaField<T["shape"][K]>;
};

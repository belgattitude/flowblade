import type { ZodObject } from 'zod';

export const getZodDuckDBSchema = <T extends ZodObject>(schema: T) => {
  const entries = schema.shape as Record<string, ZodObject>;
  const meta = [];
  for (const [key, fieldSchema] of Object.entries(entries)) {
    meta.push({ key, ...fieldSchema.meta() });
  }
  return meta;
};

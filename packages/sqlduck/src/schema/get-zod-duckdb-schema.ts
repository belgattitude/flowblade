import type { ZodObject } from 'zod';

import type { TableSchemaZod } from '../validation/zod';

export const getZodDuckDBSchema = <T extends TableSchemaZod>(schema: T) => {
  const entries = schema.shape as unknown as Record<string, ZodObject>;
  const meta = [];
  for (const [key, fieldSchema] of Object.entries(entries)) {
    meta.push({ key, ...fieldSchema.meta() });
  }
  return meta;
};

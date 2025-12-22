import type { ZodObject } from 'zod';

import type { TableSchemaZod } from '../table/table-schema-zod.type';

export const getZodDuckDBSchema = <T extends TableSchemaZod>(schema: T) => {
  const entries = schema.shape as Record<string, ZodObject>;
  const meta = [];
  for (const [key, fieldSchema] of Object.entries(entries)) {
    meta.push({ key, ...fieldSchema.meta() });
  }
  return meta;
};

import type {
  TableSchemaZod,
  ZodSchemaSupportedTypes,
} from '../table/table-schema-zod.type';

export const getZodDuckDBSchema = <T extends TableSchemaZod>(schema: T) => {
  const entries = schema.shape as Record<string, ZodSchemaSupportedTypes>;
  const meta = [];
  for (const [key, fieldSchema] of Object.entries(entries)) {
    meta.push({ key, ...fieldSchema.meta() });
  }
  return meta;
};

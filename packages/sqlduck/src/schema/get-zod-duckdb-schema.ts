import type { TableSchemaZod } from "../validation/zod";

export const getZodDuckDBSchema = <T extends TableSchemaZod>(schema: T) => {
  const meta = [];
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    meta.push({ key, ...fieldSchema.meta() });
  }
  return meta;
};

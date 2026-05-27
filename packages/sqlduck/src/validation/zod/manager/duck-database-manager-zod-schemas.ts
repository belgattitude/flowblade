import * as z from 'zod';

export const duckDatabaseManagerZodSchemas = {
  getDatabases: z.strictObject({
    comment: z.nullable(z.string()),
    database_name: z.string(),
    database_oid: z.bigint(),
    encrypted: z.boolean(),
    internal: z.boolean(),
    path: z.nullable(z.string()),
    readonly: z.boolean(),
    type: z.string(),
  }),
};

import type { DuckDBTypeId } from '@duckdb/node-api';
import * as z from 'zod';
import type { $ZodTypes } from 'zod/v4/core';

import { getZodDuckDBSchema } from './zod-duckdb-schema';

describe('test idea', () => {
  describe('zod to table', () => {
    const duckRegistry = z.registry<{
      duckdb: { type: keyof typeof DuckDBTypeId };
    }>();

    const userSchema = z.object({
      id: z.number().register(duckRegistry, {
        duckdb: { type: 'INTEGER' },
      }),
      name: z.string().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      email: z.email().meta({
        duckdb: { type: 'VARCHAR' },
      }),
      created_at: z.date().meta({
        description: 'cool',
        duckdb: { type: 'TIMESTAMP' },
      }),
    });

    const def = (userSchema as $ZodTypes)._zod.def;
    // console.log(userSchema.type, userSchema.shape, userSchema._zod);

    // const openApi = z.toJSONSchema(userSchema, { target: 'openapi-3.0' });
    // console.log(openApi);

    type User = z.infer<typeof userSchema>;

    it('should extract duckdb metadata from zod schema', () => {
      const a = getZodDuckDBSchema(userSchema);

      const entries = userSchema.shape;
      const meta = [];
      for (const [key, schema] of Object.entries(entries)) {
        const fieldMeta = schema.meta();
        meta.push({ key, ...fieldMeta });
      }
      expect(meta).toStrictEqual(a);
      expect(meta).toMatchSnapshot();
    });
  });
});

import type { DuckDBTypeId } from '@duckdb/node-api';
import * as z from 'zod';

import { getZodDuckDBSchema } from './get-zod-duckdb-schema';

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

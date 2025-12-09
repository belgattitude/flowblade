import * as z from 'zod';

describe('test idea', () => {
  describe('zod to table', () => {
    const duckRegistry = z.registry<{
      duckdb: { type: 'VARCHAR' | 'INTEGER' | 'TIMESTAMP' };
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

    type User = z.infer<typeof userSchema>;

    it('should extract duckdb metadata from zod schema', () => {
      const entries = userSchema.shape;
      const meta = [];
      for (const [key, schema] of Object.entries(entries)) {
        const fieldMeta = schema.meta();
        meta.push({ key, duckdb: schema.meta() });
      }
      expect(meta).toMatchSnapshot();
    });
  });
});

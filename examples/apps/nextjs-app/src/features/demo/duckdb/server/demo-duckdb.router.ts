import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import { DemoDuckdbRepo } from '@/features/demo/duckdb/server/demo-duckdb.repo';
import { vResolver, vValidator } from '@/lib/utils/hono-openapi-utils';
import { vCoercedIntSchema } from '@/lib/utils/valibot-utils';
import { dsDuckdbMemory } from '@/server/config/ds.duckdb-memory.config';

const app = new Hono();

const searchResponseSchema = v.object({
  meta: v.object({
    count: v.number(),
  }),
  data: v.array(
    v.object({
      productId: v.number(),
      name: v.string(),
      createdAt: v.string(),
    })
  ),
  error: v.optional(v.string()),
});
const searchRequestSchema = v.object({
  min: v.optional(vCoercedIntSchema),
  name: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  limit: v.optional(vCoercedIntSchema),
});

app.get(
  '/search',
  describeRoute({
    description: 'Search',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'text/plain': { schema: vResolver(searchResponseSchema) },
        },
      },
    },
  }),
  vValidator('query', searchRequestSchema),
  async (c) => {
    const params = c.req.valid('query');

    const repo = new DemoDuckdbRepo(dsDuckdbMemory);
    const result = await repo.search(params);

    return c.json({
      meta: result.meta,
      data: result.data,
      error: result.error,
    });
  }
);

export { app as demoDuckdbRouter };

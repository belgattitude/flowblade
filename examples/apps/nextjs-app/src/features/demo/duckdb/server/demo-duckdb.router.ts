import { Hono } from 'hono';
import { openApi } from 'hono-zod-openapi';

import { DemoDuckdbRepo } from '@/features/demo/duckdb/server/demo-duckdb.repo';
import { dsDuckdbMemory } from '@/server/config/ds.duckdb-memory.config';

const app = new Hono();

app.get(
  '/search',
  openApi({
    request: {
      // query: validators.search.params,
    },
    responses: {
      // 200: zQueryResult(validators.search.result),
    },
  }),
  async (c) => {
    const repo = new DemoDuckdbRepo(dsDuckdbMemory);
    const result = await repo.search();

    return c.json({
      meta: result.meta,
      data: result.data,
      error: result.error,
    });
  }
);

export { app as demoDuckdbRouter };

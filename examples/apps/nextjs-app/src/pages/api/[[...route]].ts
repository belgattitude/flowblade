import { handle } from '@hono/node-server/vercel';
import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { createOpenApiDocument } from 'hono-zod-openapi';

import { demoDuckdbRouter } from '@/features/demo/duckdb/server/demo-duckdb.router';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = new Hono().basePath('/api');

app.get('/health', (c) => {
  return c.json({
    time: new Date().toISOString(),
  });
});

app.route('/demo/duckdb', demoDuckdbRouter);

createOpenApiDocument(app, {
  info: {
    title: 'Flowblade example api',
    version: '1.0.0',
  },
});

app.get('/documentation', swaggerUI({ url: '/api/doc' }));

export type HonoLocalApiAppType = typeof app;

export default handle(app);

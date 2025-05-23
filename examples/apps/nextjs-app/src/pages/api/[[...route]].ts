import { handle } from '@hono/node-server/vercel';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPISpecs } from 'hono-openapi';
import type { PageConfig } from 'next';

import { demoDuckdbRouter } from '@/features/demo/duckdb/server/demo-duckdb.router';
import { ethicalProductRouter } from '@/features/products/server/ethical-product.router';
import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info';

export const config: PageConfig = {
  runtime: 'nodejs',
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
app.route('/product/ethical', ethicalProductRouter);

const { baseUrl } = getNextjsHostInfo();

app.get(
  '/openapi',
  openAPISpecs(app, {
    documentation: {
      info: {
        title: 'Flowblade API',
        version: '1.0.0',
        description: 'Flowblade API',
      },
      servers: [{ url: baseUrl, description: 'Local Server' }],
    },
  })
);

app.get(
  '/reference',
  Scalar({ url: '/api/openapi', theme: 'purple', pageTitle: 'Flowblade API' })
);

export type HonoLocalApiAppType = typeof app;

export default handle(app);

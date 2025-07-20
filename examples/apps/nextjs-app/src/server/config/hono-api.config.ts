import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { openAPISpecs } from 'hono-openapi';

import { demoDuckdbRouter } from '@/features/demo/duckdb/server/demo-duckdb.router.ts';
import { ethicalProductRouter } from '@/features/products/server/ethical-product.router.ts';
import { getNextjsHostInfo } from '@/lib/nextjs/get-nextjs-host-info.ts';

import { serverEnv } from '../../env/server.env.mjs';

export const createHonoApp = () => {
  const app = new Hono().basePath('/api');

  if (serverEnv.NEXT_CONFIG_COMPRESS === 'true') {
    app.use(compress());
  }

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
          title: 'Flowblade example API',
          version: '1.0.0',
          description: 'Flowblade example API',
        },
        servers: [{ url: baseUrl, description: 'Local Server' }],
      },
    })
  );

  app.get(
    '/reference',
    Scalar({
      url: '/api/openapi',
      theme: 'purple',
      pageTitle: 'Flowblade example API',
    })
  );

  return app;
};

const honoApp = createHonoApp();

export type HonoApiType = typeof honoApp;

export const honoApiConfig = {
  app: honoApp,
} as const;

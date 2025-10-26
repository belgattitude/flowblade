import { handle } from '@hono/node-server/vercel';

import { honoApiConfig } from '@/server/config/hono-api.config.ts';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

const app = honoApiConfig.app;

export default handle(app);

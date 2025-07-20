import { handle } from '@hono/node-server/vercel';
import type { PageConfig } from 'next';

import { honoApiConfig } from '@/server/config/hono-api.config.ts';

export const config: PageConfig = {
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

const app = honoApiConfig.app;

export default handle(app);

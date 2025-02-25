import { Hono } from 'hono';
import { openApi } from 'hono-zod-openapi';
import { z } from 'zod';

import { EthicalProductRepo } from '@/features/products/server/ethical-product.repo';

const app = new Hono();

app.get(
  '/search',
  openApi({
    request: {
      query: z.object({
        brands: z.string().optional(),
      }),
    },
    responses: {
      200: z.array(
        z.object({
          label: z.string(),
          brand: z.string(),
          price: z.number(),
        })
      ),
    },
  }),
  async (c) => {
    const query = c.req.valid('query');
    const brands =
      query.brands === undefined ? undefined : query.brands.split(',');
    return c.json(await new EthicalProductRepo().search({ brands }));
  }
);

app.get(
  '/brands',
  openApi({
    request: {},
    responses: {
      200: z.array(
        z.object({
          name: z.string(),
        })
      ),
    },
  }),
  async (c) => {
    return c.json(await new EthicalProductRepo().getBrands());
  }
);

export { app as ethicalProductRouter };

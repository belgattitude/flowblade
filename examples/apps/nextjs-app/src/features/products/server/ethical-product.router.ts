import { Hono } from 'hono';
import { openApi } from 'hono-zod-openapi';
import { z } from 'zod';

import { EthicalProductRepo } from '@/features/products/server/ethical-product.repo';
import { wait } from '@/lib/utils/wait';

const app = new Hono();

export const ethicalProductSearchRequestSchema = {
  query: z.object({
    brands: z.string().optional(),
    slowdownApiMs: z.string().optional().default('0'),
  }),
};

export const EthicalProductRequestSchema = app.get(
  '/search',
  openApi({
    request: ethicalProductSearchRequestSchema,
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
    const slowdownApiMs = Number.parseInt(query.slowdownApiMs, 10) ?? 0;
    if (slowdownApiMs > 0) {
      await wait(slowdownApiMs);
    }
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

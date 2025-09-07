import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import * as v from 'valibot';

import { EthicalProductRepo } from '@/features/products/server/ethical-product.repo';
import { wait } from '@/lib/utils/wait';

const app = new Hono();

export const ethicalProductSearchRequestSchema = v.object({
  brands: v.optional(v.string()),
  slowdownApiMs: v.optional(v.string()),
});

app.get(
  '/search',
  describeRoute({
    description: 'Search for ethical products',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              v.array(
                v.object({
                  label: v.string(),
                  brand: v.string(),
                  price: v.number(),
                })
              )
            ),
          },
        },
      },
    },
  }),
  vValidator(
    'query',
    v.object({
      brands: v.optional(v.string()),
      slowdownApiMs: v.optional(v.string()),
    })
  ),
  async (c) => {
    const query = c.req.valid('query');
    const slowdownApiMs = Number.parseInt(query.slowdownApiMs ?? '0', 10) ?? 0;
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
  describeRoute({
    description: 'Get list of ethical brands',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              v.array(
                v.object({
                  name: v.string(),
                })
              )
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    return c.json(await new EthicalProductRepo().getBrands());
  }
);

export { app as ethicalProductRouter };

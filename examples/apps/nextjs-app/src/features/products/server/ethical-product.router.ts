import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import * as v from 'valibot';

import {
  EthicalProductRepo,
  ethicalProductSchema,
  ethicalProductSearchParamsSchema,
} from '@/features/products/server/ethical-product.repo';
import { wait } from '@/lib/utils/wait';

const app = new Hono();

app.get(
  '/search',
  describeRoute({
    description: 'Search for ethical products',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(v.array(ethicalProductSchema)),
          },
        },
      },
    },
  }),
  validator(
    'query',
    v.object({
      ...ethicalProductSearchParamsSchema.entries,
      slowdownApiMs: v.optional(
        v.pipe(
          v.string(),
          v.transform((val) => Number.parseInt(val, 10)),
          v.integer(),
          v.metadata({
            description:
              'Artificially slow down the API by this many milliseconds.',
          })
        )
      ),
    }),
    undefined,
    {
      options: {
        typeMode: 'output',
      },
    }
  ),
  async (c) => {
    const { slowdownApiMs, brands, minPrice } = c.req.valid('query');
    if (slowdownApiMs) {
      await wait(slowdownApiMs);
    }
    return c.json(
      await new EthicalProductRepo().search({
        brands: brands,
        minPrice,
      })
    );
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

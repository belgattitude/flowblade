import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";

import { DemoDuckdbRepo } from "@/features/demo/duckdb/server/demo-duckdb.repo";
import { vCoercedIntSchema } from "@/lib/utils/valibot-utils";
import { dsDuckdbMemory } from "@/server/config/ds.duckdb-memory.config";

const app = new Hono();

const searchResponseSchema = v.object({
  data: v.array(
    v.object({
      createdAt: v.string(),
      name: v.string(),
      productId: v.number(),
    })
  ),
  error: v.optional(v.string()),
  meta: v.object({
    count: v.number(),
  }),
});
const searchRequestSchema = v.object({
  createdAt: v.optional(v.string()),
  limit: v.optional(vCoercedIntSchema),
  min: v.optional(vCoercedIntSchema),
  name: v.optional(v.string()),
});

app.get(
  "/search",
  describeRoute({
    description: "Search",
    responses: {
      200: {
        content: {
          "application/json": { schema: resolver(searchResponseSchema) },
        },
        description: "Successful response",
      },
    },
  }),
  validator("query", searchRequestSchema, undefined, {
    options: {
      typeMode: "output",
    },
  }),
  async (c) => {
    const params = c.req.valid("query");

    const repo = new DemoDuckdbRepo(dsDuckdbMemory);
    const result = await repo.search(params);

    return c.json({
      data: result.data,
      error: result.error,
      meta: result.meta,
    });
  }
);

export { app as demoDuckdbRouter };

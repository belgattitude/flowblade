import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";

import {
  getSystemStats,
  systemStatsSchema,
} from "@/features/system/system-stats.ts";

const app = new Hono();

app.get(
  "/stats",
  describeRoute({
    description: "System stats",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(systemStatsSchema),
          },
        },
        description: "Successful response",
      },
    },
  }),
  async (c) => c.json(await getSystemStats())
);

export { app as systemRouter };

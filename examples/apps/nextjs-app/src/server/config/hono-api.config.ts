import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { compress } from "hono/compress";

import { demoDuckdbRouter } from "@/features/demo/duckdb/server/demo-duckdb.router.ts";
import { ethicalProductRouter } from "@/features/products/server/ethical-product.router.ts";
import { systemRouter } from "@/features/system/system.router.ts";
import { getNextjsHostInfo } from "@/lib/nextjs/get-nextjs-host-info.ts";

import { serverEnv } from "../../env/server.env.mjs";

export const createHonoApp = () => {
  const app = new Hono().basePath("/api");

  if (serverEnv.NEXT_CONFIG_COMPRESS === "true") {
    app.use(compress());
  }

  app.get("/health", (c) =>
    c.json({
      time: new Date().toISOString(),
    })
  );

  app.route("/demo/duckdb", demoDuckdbRouter);
  app.route("/product/ethical", ethicalProductRouter);
  app.route("/system", systemRouter);

  const { baseUrl } = getNextjsHostInfo();

  app.get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          description: "Flowblade example API",
          title: "Flowblade example API",
          version: "1.0.0",
        },
        servers: [{ description: "Local Server", url: baseUrl }],
      },
    })
  );

  app.get(
    "/reference",
    Scalar({
      pageTitle: "Flowblade example API",
      theme: "purple",
      url: "/api/openapi.json",
    })
  );

  return app;
};

const honoApp = createHonoApp();

export type HonoApiType = typeof honoApp;

export const honoApiConfig = {
  app: honoApp,
} as const;

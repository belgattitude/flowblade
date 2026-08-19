import { handle } from "hono/vercel";

import { honoApiConfig } from "@/server/config/hono-api.config.ts";

export const runtime = "nodejs";

const { app } = honoApiConfig;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const HEAD = handle(app);

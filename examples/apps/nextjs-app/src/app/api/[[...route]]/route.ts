import { honoApiConfig } from "@/server/config/hono-api.config.ts";

export const runtime = "nodejs";

const { app } = honoApiConfig;

// Same as the deprecated `handle` from "hono/vercel" (removed in hono v5)
const handler = (req: Request) => app.fetch(req);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const HEAD = handler;

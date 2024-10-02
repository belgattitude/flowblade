import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api/hono/node');

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  });
});

export const DELETE = handle(app);
export const GET = handle(app);
export const PATCH = handle(app);
export const POST = handle(app);
export const PUT = handle(app);

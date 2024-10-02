import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';

export const config = {
  api: {
    bodyParser: false,
  },
  // Specifies the maximum allowed duration for this function to execute (in seconds)
  maxDuration: 120,
};

const app = new Hono().basePath('/api/legacy/hono');

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  });
});

export default handle(app);

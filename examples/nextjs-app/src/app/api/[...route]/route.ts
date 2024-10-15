import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createOpenApiDocument, openApi } from 'hono-zod-openapi';
import { sql } from 'kysely';
import { z } from 'zod';

import { dbKyselySqlServer } from '@/server/config/db.kysely-sqlserver.config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const app = new Hono().basePath('/api');

/**
 * Sample 1
 */
const zProduct = z.object({
  id: z.number(),
  name: z.string(),
} satisfies Record<string, unknown>);

app.get(
  '/01-products',
  openApi({
    request: {
      query: z.object({
        limit: z.coerce.number().optional().default(100),
      }),
    },
    responses: {
      200: z.array(zProduct),
    },
  }),
  async (c) => {
    const { limit } = c.req.valid('query');
    const { rows } = await sql`
        SELECT TOP ${sql.lit(limit)} 
            p.id,
            p.reference,
            p.name,
            p.barcode_ean13,
            p.brand_id,
            p.created_at,
            p.updated_at
        FROM [common].[product] as p 
    `.execute(dbKyselySqlServer);
    return c.json(rows);
  }
);

app.get(
  '/02-products',
  openApi({
    request: {
      query: z.object({
        limit: z.coerce.number().optional().default(100),
        searchName: z.string().optional(),
      }),
    },
    responses: {
      200: z.array(zProduct),
    },
  }),
  async (c) => {
    const { limit, searchName } = c.req.valid('query');
    const rows = await dbKyselySqlServer
      .selectFrom('common.product as p')
      .select(['name', 'barcode_ean13'])
      .$if(searchName !== undefined, (q) =>
        q.where('name', 'like', `%${searchName}%`)
      )
      .top(limit)
      .execute();
    return c.json(rows);
  }
);

createOpenApiDocument(app, {
  info: {
    title: 'Sample api',
    version: '1.0.0',
  },
});

export const DELETE = handle(app);
export const GET = handle(app);
export const PATCH = handle(app);
export const POST = handle(app);
export const PUT = handle(app);

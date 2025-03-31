import fs from 'node:fs';
import { ReadableStream } from 'node:stream/web';

import type { FastifyInstance } from 'fastify';

export default async function MainRoute(fastify: FastifyInstance) {
  fastify.get('/stream-csv', async (request, reply) => {
    const stream = fs.createReadStream('./data/test.csv');
    reply.header('Content-Type', 'application/octet-stream');
    reply.send(ReadableStream.from(stream));

    return reply
      .headers({
        // 'Content-Type', 'application/octet-stream'
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="export.csv"',
        'cache-control': 'no-cache',
        'transfer-encoding': 'chunked',
      })
      .send(ReadableStream.from(stream));
  });
}

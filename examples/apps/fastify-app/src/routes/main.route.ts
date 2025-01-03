import type { FastifyInstance } from 'fastify';

export default async function MainRoute(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return 'hello';
  });
}

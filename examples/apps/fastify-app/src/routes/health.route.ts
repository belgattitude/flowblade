import type { FastifyInstance } from 'fastify';
import { type Static, Type } from 'typebox';

const healthSchema = Type.Object({
  time: Type.String(),
});

export default async function TreeRoute(fastify: FastifyInstance) {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          '2xx': healthSchema,
        },
      },
    },
    async (): Promise<Static<typeof healthSchema>> => {
      return {
        time: new Date().toISOString(),
      };
    }
  );
}

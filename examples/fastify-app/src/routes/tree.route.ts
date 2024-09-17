import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

const categorySchema = Type.Recursive((self) =>
  Type.Object({
    id: Type.String(),
    name: Type.String(),
    children: Type.Union([Type.Null(), Type.Array(self)]),
  })
);

const categorySchema3 = Type.Object({
  id: Type.String(),
  name: Type.String(),
  children: Type.Union([Type.Null(), Type.String()]),
});

export default async function TreeRoute(fastify: FastifyInstance) {
  fastify.get(
    '/tree',
    {
      schema: {
        querystring: Type.Object({
          foo: Type.Number(),
        }),
        response: {
          '2xx': categorySchema3,
        },
      },
    },
    async () => {
      return 'hello';
    }
  );
}

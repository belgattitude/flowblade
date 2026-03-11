import type { FastifyInstance } from 'fastify';
import { type Static, Type } from 'typebox';

const categorySchema = Type.Array(
  Type.Cyclic(
    {
      Node: Type.Object({
        id: Type.String(),
        name: Type.String(),
        children: Type.Union([Type.Null(), Type.Array(Type.Ref('Node'))]),
      }),
    },
    'Node'
  )
);

export default async function TreeRoute(fastify: FastifyInstance) {
  fastify.get(
    '/tree',
    {
      schema: {
        querystring: Type.Object({
          foo: Type.Number(),
        }),
        response: {
          '2xx': categorySchema,
        },
      },
    },
    async (): Promise<Static<typeof categorySchema>> => {
      return [
        {
          name: 'category1',
          id: '1',
          children: [
            {
              id: '1_1',
              name: 'category1_1',
              children: [],
            },
          ],
        },
      ];
    }
  );
}

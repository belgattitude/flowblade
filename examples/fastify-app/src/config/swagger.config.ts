import type { SwaggerOptions } from '@fastify/swagger';

export const swaggerConfig: SwaggerOptions = {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Flowblade API',
      description:
        'A fastify-based flowblade example api, see https://github.com/belgattitude/flowblade/tree/main/examples/fastify-app',
      version: '0.1.0',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
    ],
    tags: [{ name: 'public', description: 'User related end-points' }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'header',
        },
      },
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here',
    },
  },
};

import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

import { swaggerConfig } from '../config/swagger.config';
import { swaggerUiConfig } from '../config/swagger-ui.config';

export default fastifyPlugin(async function (fastify: FastifyInstance) {
  fastify.register(swagger, swaggerConfig);
  fastify.register(swaggerUi, swaggerUiConfig);
});

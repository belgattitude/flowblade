import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { default as fastifyPlugin } from "fastify-plugin";

import { swaggerUiConfig } from "@/config/swagger-ui.config";
import { swaggerConfig } from "@/config/swagger.config";

export default fastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.register(swagger, swaggerConfig);
  fastify.register(swaggerUi, swaggerUiConfig);
});

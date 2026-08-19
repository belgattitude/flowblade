import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function onRequest(_request, _reply, next) {
      next();
    },
    preHandler: function preHandler(_request, _reply, next) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject, _request, _reply) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
};

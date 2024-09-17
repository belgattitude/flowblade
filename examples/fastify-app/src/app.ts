import path from 'node:path';

import AutoLoad from '@fastify/autoload';
import type { FastifyInstance } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Place here your custom code!

  // [...here...]

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(import.meta.dirname, 'plugins'),
    ignoreFilter: (path) => path.endsWith('.test.js'),
    forceESM: true,
    maxDepth: 5,
    options: { ...opts },
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(import.meta.dirname, 'routes'),
    matchFilter: /\.route.ts$/,
    ignoreFilter: (path) => path.endsWith('.test.js'),
    forceESM: true,
    maxDepth: 5,
    options: { ...opts },
  });
}

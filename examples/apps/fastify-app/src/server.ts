import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import closeWithGrace from 'close-with-grace';
import { default as fastify } from 'fastify';

import { app } from './app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 8080;
const graceDelay = process.env.FASTIFY_CLOSE_GRACE_DELAY
  ? Number(process.env.FASTIFY_CLOSE_GRACE_DELAY)
  : 1000;

const server = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

server.register(app);

closeWithGrace({ delay: graceDelay }, async function ({ signal, err, manual }) {
  server.log.info(
    `Closing with grace delay "${signal}" ${manual ? '(manual)' : ''}`
  );
  if (err) {
    server.log.error(err);
  }
  await server.close();
});

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
});

import Fastify from 'fastify';
import { healthRoutes } from './routes/health.routes.js';
import { batchRoutes } from './routes/batch.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.addHook('onRequest', async (_request, reply) => {
    reply.header('access-control-allow-origin', '*');
    reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    reply.header('access-control-allow-headers', 'Content-Type, Authorization');

    if (_request.method === 'OPTIONS') {
      reply.code(204).send();
    }
  });

  app.register(healthRoutes);
  app.register(batchRoutes);

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, req: request.raw }, 'Unhandled error');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return app;
}

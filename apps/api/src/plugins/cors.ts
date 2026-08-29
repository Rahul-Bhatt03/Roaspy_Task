import { FastifyInstance } from 'fastify';

export async function corsPlugin(app: FastifyInstance) {
  await app.register(async (instance) => {
    instance.addHook('onRequest', async (_request, reply) => {
      reply.header('x-app', 'bulk-url-health-checker');
    });
  });
}

import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }));
}

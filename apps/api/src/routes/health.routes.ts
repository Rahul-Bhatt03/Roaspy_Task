import { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { redisConnection } from '../queues/connection.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const [database, redis] = await Promise.allSettled([
      db.execute(sql`SELECT 1`),
      redisConnection.ping(),
    ]);
    const healthy = database.status === 'fulfilled' && redis.status === 'fulfilled';

    return reply.code(healthy ? 200 : 503).send({
      ok: healthy,
      status: healthy ? 'healthy' : 'degraded',
      dependencies: {
        database: database.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        redis: redis.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      },
      timestamp: new Date().toISOString(),
    });
  });
}

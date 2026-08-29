import { FastifyInstance } from 'fastify';
import { BatchController } from '../controllers/batch.controller.js';
import { BatchService } from '../services/batch.service.js';
import { PostgresBatchRepository } from '../repositories/implementations/postgres-batch.repository.js';
import { BATCH_EVENTS_CHANNEL } from '../cache/index.js';
import { redisConnection } from '../queues/connection.js';
import { startOutboxPublisher } from '../queues/outbox.publisher.js';
import { z } from 'zod';

export async function batchRoutes(app: FastifyInstance) {
  const batchRepository = new PostgresBatchRepository();
  const batchService = new BatchService(batchRepository);
  const batchController = new BatchController(batchService);
  const outboxTimer = startOutboxPublisher();
  app.addHook('onClose', async () => clearInterval(outboxTimer));

  app.get('/batches', batchController.getAllBatches);
  app.post('/batches', batchController.createBatch);
  app.get('/batches/:batchId', batchController.getBatchById);
  app.get('/batches/:batchId/urls', batchController.getBatchUrls);
  app.post('/batches/:batchId/cancel', batchController.cancelBatch);
  app.post('/batches/:batchId/retry-failed', batchController.retryFailed);
  app.get('/batches/:batchId/events', async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    if (!z.string().uuid().safeParse(batchId).success) {
      return reply.code(400).send({ message: 'Invalid batch ID.' });
    }
    const initialBatch = await batchService.getBatchById(batchId);
    if (!initialBatch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    const subscriber = redisConnection.duplicate();
    await subscriber.subscribe(BATCH_EVENTS_CHANNEL);
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    reply.raw.write(`data: ${JSON.stringify(initialBatch)}\n\n`);

    const sendEvent = async (message: string) => {
      const event = JSON.parse(message) as { batchId?: string };
      if (event.batchId === batchId) {
        const batch = await batchService.getBatchById(batchId);
        if (batch) {
          reply.raw.write(`data: ${JSON.stringify(batch)}\n\n`);
        }
      }
    };

    subscriber.on('message', (_channel, message) => {
      void sendEvent(message);
    });
    const heartbeat = setInterval(() => reply.raw.write(': keep-alive\n\n'), 15000);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      subscriber.removeAllListeners();
      void subscriber.unsubscribe(BATCH_EVENTS_CHANNEL).finally(() => subscriber.quit());
    });
  });
}

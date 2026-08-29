import { FastifyInstance } from 'fastify';
import { BatchController } from '../controllers/batch.controller.js';
import { BatchService } from '../services/batch.service.js';
import { PostgresBatchRepository } from '../repositories/implementations/postgres-batch.repository.js';

export async function batchRoutes(app: FastifyInstance) {
  const batchRepository = new PostgresBatchRepository();
  const batchService = new BatchService(batchRepository);
  const batchController = new BatchController(batchService);

  app.get('/batches', batchController.getAllBatches);
  app.post('/batches', batchController.createBatch);
  app.get('/batches/:batchId', batchController.getBatchById);
}

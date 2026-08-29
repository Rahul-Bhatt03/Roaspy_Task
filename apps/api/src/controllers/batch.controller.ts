import { FastifyReply, FastifyRequest } from 'fastify';
import { BatchService } from '../services/batch.service.js';

export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  createBatch = async (
    request: FastifyRequest<{ Body: { urls?: string[] } }>,
    reply: FastifyReply,
  ) => {
    const urls = (request.body.urls ?? [])
      .map((url) => url.trim())
      .filter(Boolean);

    if (!urls.length) {
      return reply.code(400).send({ message: 'At least one URL is required.' });
    }

    const batch = await this.batchService.createBatch({ urls });

    return reply.code(201).send({ data: batch });
  };

  getAllBatches = async (_request: FastifyRequest, reply: FastifyReply) => {
    const batches = await this.batchService.getAllBatches();
    return reply.send({ data: batches });
  };

  getBatchById = async (
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) => {
    const batch = await this.batchService.getBatchById(request.params.batchId);

    if (!batch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    return reply.send({ data: batch });
  };
}

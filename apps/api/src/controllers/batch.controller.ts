import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BatchService } from '../services/batch.service.js';

const batchIdSchema = z.string().uuid();
const batchBodySchema = z.object({ urls: z.array(z.string()).optional() });
const urlSchema = z
  .string()
  .url()
  .refine((url) => /^https?:$/i.test(new URL(url).protocol), {
    message: 'Only HTTP and HTTPS URLs are supported.',
  });

export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  createBatch = async (
    request: FastifyRequest<{ Body: { urls?: string[] } }>,
    reply: FastifyReply,
  ) => {
    const parsedBody = batchBodySchema.safeParse(request.body ?? {});
    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Request body must contain an array of URLs.' });
    }

    const urls = (parsedBody.data.urls ?? []).map((url) => url.trim()).filter(Boolean);

    if (!urls.length) {
      return reply.code(400).send({ message: 'At least one URL is required.' });
    }

    if (urls.length > 1000) {
      return reply.code(400).send({ message: 'A batch cannot contain more than 1000 URLs.' });
    }

    const invalidUrl = urls.find((url) => !urlSchema.safeParse(url).success);
    if (invalidUrl) {
      return reply.code(400).send({ message: `Invalid URL: ${invalidUrl}` });
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
    if (!batchIdSchema.safeParse(request.params.batchId).success) {
      return reply.code(400).send({ message: 'Invalid batch ID.' });
    }
    const batch = await this.batchService.getBatchById(request.params.batchId);

    if (!batch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    return reply.send({ data: batch });
  };

  getBatchUrls = async (
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) => {
    if (!batchIdSchema.safeParse(request.params.batchId).success) {
      return reply.code(400).send({ message: 'Invalid batch ID.' });
    }
    const batch = await this.batchService.getBatchById(request.params.batchId);
    if (!batch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    return reply.send({ data: await this.batchService.getBatchUrls(request.params.batchId) });
  };

  cancelBatch = async (
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) => {
    if (!batchIdSchema.safeParse(request.params.batchId).success) {
      return reply.code(400).send({ message: 'Invalid batch ID.' });
    }
    const batch = await this.batchService.cancelBatch(request.params.batchId);
    if (!batch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    return reply.send({ data: batch });
  };

  retryFailed = async (
    request: FastifyRequest<{ Params: { batchId: string } }>,
    reply: FastifyReply,
  ) => {
    if (!batchIdSchema.safeParse(request.params.batchId).success) {
      return reply.code(400).send({ message: 'Invalid batch ID.' });
    }
    const result = await this.batchService.retryFailed(request.params.batchId);
    if (!result.batch) {
      return reply.code(404).send({ message: 'Batch not found' });
    }

    return reply.send({ data: result.batch });
  };
}

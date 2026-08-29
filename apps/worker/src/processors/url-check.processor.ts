import { Job, Worker } from 'bullmq';
import { redisConnection } from '../queues/connection.js';
import { URL_CHECK_QUEUE_NAME } from '../queues/url-check.queue.js';
import { UrlCheckService } from '../services/url-check.service.js';

export type UrlCheckJobData = {
  batchId: string;
  urlId: string;
  url: string;
};

export const createUrlCheckWorker = (urlCheckService: UrlCheckService) => {
  return new Worker<UrlCheckJobData>(
    URL_CHECK_QUEUE_NAME,
    async (job: Job<UrlCheckJobData>) => {
      await urlCheckService.process(job.data);
      return { ok: true, jobId: job.id };
    },
    { connection: redisConnection },
  );
};

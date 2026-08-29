import { PostgresUrlCheckRepository } from './repositories/implementations/postgres-url-check.repository.js';
import { createUrlCheckWorker } from './processors/url-check.processor.js';
import { UrlCheckService } from './services/url-check.service.js';
import { urlCheckQueue } from './queues/url-check.queue.js';

const start = async () => {
  await urlCheckQueue.setGlobalConcurrency(5);
  const worker = createUrlCheckWorker(new UrlCheckService(new PostgresUrlCheckRepository()));

  worker.on('ready', () => {
    console.log('Worker ready and connected to Redis');
  });

  worker.on('error', (error) => {
    console.error('Worker error', error);
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  const shutdown = async () => {
    await worker.close();
    await urlCheckQueue.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((error) => {
  console.error('Unable to start worker', error);
  process.exit(1);
});

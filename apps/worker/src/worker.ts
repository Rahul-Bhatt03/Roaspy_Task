import { PostgresUrlCheckRepository } from './repositories/implementations/postgres-url-check.repository.js';
import { createUrlCheckWorker } from './processors/url-check.processor.js';
import { UrlCheckService } from './services/url-check.service.js';

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

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

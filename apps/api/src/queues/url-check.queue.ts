import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const URL_CHECK_QUEUE_NAME = 'url-check';

export type UrlCheckJobPayload = {
  batchId: string;
  urlId: string;
  url: string;
};

export const urlCheckQueue = new Queue<UrlCheckJobPayload>(URL_CHECK_QUEUE_NAME, {
  connection: redisConnection,
});

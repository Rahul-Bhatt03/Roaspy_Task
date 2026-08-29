import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const URL_CHECK_QUEUE_NAME = 'url-check';

export const urlCheckQueue = new Queue(URL_CHECK_QUEUE_NAME, {
  connection: redisConnection,
});

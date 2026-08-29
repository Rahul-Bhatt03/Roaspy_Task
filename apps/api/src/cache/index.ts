import { redisConnection } from '../queues/connection.js';

export const BATCH_LIST_CACHE_KEY = 'cache:batches:list';
export const BATCH_EVENTS_CHANNEL = 'events:batches';

export async function getCacheValue<T>(key: string): Promise<T | undefined> {
  const value = await redisConnection.get(key);
  return value ? (JSON.parse(value) as T) : undefined;
}

export async function setCacheValue<T>(key: string, value: T): Promise<void> {
  await redisConnection.set(key, JSON.stringify(value), 'EX', 30);
}

export async function clearCache(key: string): Promise<void> {
  await redisConnection.del(key);
}

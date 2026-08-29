import { redisConnection } from './connection.js';

const windowKey = 'url-check:global-rate-window';
const limit = 10;

export async function waitForGlobalRateLimit() {
  let acquired = false;
  while (!acquired) {
    const result = await redisConnection.eval(
      `local count = redis.call('INCR', KEYS[1])
       if count == 1 then redis.call('PEXPIRE', KEYS[1], 1000) end
       return count`,
      1,
      windowKey,
    );

    if (Number(result) <= limit) {
      acquired = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

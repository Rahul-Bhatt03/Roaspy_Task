import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { batches } from '../../db/schema/batches.js';
import { urlCheckQueue } from '../../queues/url-check.queue.js';
import { BatchRepository } from '../interfaces/batch.repository.js';

export class PostgresBatchRepository implements BatchRepository {
  async findAll() {
    return db.select().from(batches).orderBy(batches.createdAt).execute();
  }

  async findById(id: string) {
    const result = await db.select().from(batches).where(eq(batches.id, id)).limit(1).execute();
    return result[0] ?? null;
  }

  async create(input: { urls: string[] }) {
    const totalUrls = input.urls.length;

    const [createdBatch] = await db
      .insert(batches)
      .values({
        status: 'pending',
        totalUrls,
        completedUrls: 0,
        failedUrls: 0,
      })
      .returning();

    if (createdBatch && totalUrls > 0) {
      await urlCheckQueue.addBulk(
        input.urls.map((url, index) => ({
          name: `${String(createdBatch.id)}-${index}`,
          data: {
            batchId: String(createdBatch.id),
            urlId: crypto.randomUUID(),
            url,
          },
        })),
      );
    }

    return createdBatch;
  }
}

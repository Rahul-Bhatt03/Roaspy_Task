import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { batches, BatchRecord } from '../../db/schema/batches.js';
import { urlChecks } from '../../db/schema/url-checks.js';
import { jobOutbox } from '../../db/schema/job-outbox.js';
import {
  BATCH_EVENTS_CHANNEL,
  BATCH_LIST_CACHE_KEY,
  clearCache,
  getCacheValue,
  setCacheValue,
} from '../../cache/index.js';
import { redisConnection } from '../../queues/connection.js';
import { urlCheckQueue } from '../../queues/url-check.queue.js';
import { BatchRepository } from '../interfaces/batch.repository.js';

export class PostgresBatchRepository implements BatchRepository {
  async findAll() {
    const cached = await getCacheValue<BatchRecord[]>(BATCH_LIST_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const result = await db.select().from(batches).orderBy(batches.createdAt).execute();
    await setCacheValue(BATCH_LIST_CACHE_KEY, result);
    return result;
  }

  async findById(id: string) {
    const result = await db.select().from(batches).where(eq(batches.id, id)).limit(1).execute();
    return result[0] ?? null;
  }

  async findUrls(batchId: string) {
    return db.select().from(urlChecks).where(eq(urlChecks.batchId, batchId)).execute();
  }

  async create(input: { urls: string[] }) {
    const urls = [...new Set(input.urls)];
    const createdBatch = await db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(batches)
        .values({ status: 'pending', totalUrls: urls.length, completedUrls: 0, failedUrls: 0 })
        .returning();

      await tx.insert(urlChecks).values(
        urls.map((url) => ({
          id: crypto.randomUUID(),
          batchId: batch.id,
          url,
          status: 'pending' as const,
        })),
      );

      const persistedUrls = await tx
        .select()
        .from(urlChecks)
        .where(eq(urlChecks.batchId, batch.id))
        .execute();
      await tx.insert(jobOutbox).values(
        persistedUrls.map((urlCheck) => ({
          jobId: urlCheck.id,
          batchId: batch.id,
          payload: { batchId: String(batch.id), urlId: String(urlCheck.id), url: urlCheck.url },
        })),
      );

      return batch;
    });

    await clearCache(BATCH_LIST_CACHE_KEY);
    await redisConnection.publish(
      BATCH_EVENTS_CHANNEL,
      JSON.stringify({ batchId: createdBatch.id }),
    );
    return createdBatch;
  }

  async cancel(id: string) {
    const cancelledBatch = await db.transaction(async (tx) => {
      const [batch] = await tx
        .update(batches)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(and(eq(batches.id, id), inArray(batches.status, ['pending', 'running'])))
        .returning();

      if (!batch) {
        return null;
      }

      await tx.execute(sql`
        UPDATE url_checks
        SET status = 'skipped'::url_check_status, error = 'Cancelled', updated_at = NOW()
        WHERE batch_id = ${id}::uuid AND status IN ('pending', 'in_progress')
      `);
      await tx
        .update(jobOutbox)
        .set({ cancelledAt: new Date() })
        .where(and(eq(jobOutbox.batchId, id), isNull(jobOutbox.publishedAt)));

      return batch;
    });

    if (cancelledBatch) {
      const queuedJobs = await urlCheckQueue.getJobs(['waiting', 'delayed', 'prioritized']);
      await Promise.all(
        queuedJobs.filter((job) => job.data.batchId === id).map((job) => job.remove()),
      );
    }

    if (cancelledBatch) {
      await clearCache(BATCH_LIST_CACHE_KEY);
      await redisConnection.publish(BATCH_EVENTS_CHANNEL, JSON.stringify({ batchId: id }));
    }

    return cancelledBatch ?? null;
  }

  async retryFailed(id: string) {
    const retriedUrls = await db.transaction(async (tx) => {
      const [currentBatch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, id))
        .limit(1)
        .execute();
      if (!currentBatch || currentBatch.status === 'cancelled') {
        return { batch: currentBatch ?? null, urls: [] };
      }

      const failedUrls = await tx
        .select()
        .from(urlChecks)
        .where(eq(urlChecks.batchId, id))
        .execute();
      const onlyFailed = failedUrls.filter((urlCheck) => urlCheck.status === 'failed');

      if (onlyFailed.length > 0) {
        await tx
          .update(urlChecks)
          .set({
            status: 'pending',
            error: null,
            httpStatus: null,
            responseTime: null,
            pageTitle: null,
            attemptCount: 0,
            completedAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(urlChecks.batchId, id),
              inArray(
                urlChecks.id,
                onlyFailed.map((urlCheck) => urlCheck.id),
              ),
            ),
          )
          .execute();
      }

      const [batch] = await tx
        .update(batches)
        .set({
          status: onlyFailed.length > 0 ? 'pending' : undefined,
          failedUrls: onlyFailed.length > 0 ? 0 : undefined,
          updatedAt: new Date(),
          completedAt: onlyFailed.length > 0 ? null : undefined,
        })
        .where(eq(batches.id, id))
        .returning();

      if (batch && onlyFailed.length > 0) {
        await tx.insert(jobOutbox).values(
          onlyFailed.map((urlCheck) => ({
            batchId: id,
            jobId: crypto.randomUUID(),
            payload: { batchId: id, urlId: String(urlCheck.id), url: urlCheck.url },
          })),
        );
      }

      return { batch: batch ?? null, urls: onlyFailed };
    });

    if (retriedUrls.batch) {
      await clearCache(BATCH_LIST_CACHE_KEY);
      await redisConnection.publish(BATCH_EVENTS_CHANNEL, JSON.stringify({ batchId: id }));
    }

    return retriedUrls;
  }
}

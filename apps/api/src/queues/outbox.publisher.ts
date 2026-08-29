import { and, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { jobOutbox } from '../db/schema/job-outbox.js';
import { urlCheckQueue } from './url-check.queue.js';

const jobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export async function publishPendingJobs() {
  await db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(jobOutbox)
      .where(and(isNull(jobOutbox.publishedAt), isNull(jobOutbox.cancelledAt)))
      .limit(100)
      .for('update', { skipLocked: true })
      .execute();

    if (!pending.length) {
      return;
    }

    await urlCheckQueue.addBulk(
      pending.map((entry) => ({
        name: String(entry.jobId),
        data: entry.payload as { batchId: string; urlId: string; url: string },
        opts: { ...jobOptions, jobId: String(entry.jobId) },
      })),
    );

    await tx
      .update(jobOutbox)
      .set({ publishedAt: new Date() })
      .where(
        inArray(
          jobOutbox.id,
          pending.map((entry) => entry.id),
        ),
      );
  });
}

export function startOutboxPublisher() {
  const publish = () =>
    void publishPendingJobs().catch((error) => console.error('Outbox publisher error', error));
  publish();
  return setInterval(publish, 1000);
}

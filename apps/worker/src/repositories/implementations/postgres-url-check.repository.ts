import { sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { redisConnection } from '../../queues/connection.js';

export class PostgresUrlCheckRepository {
  async saveResult(input: {
    batchId: string;
    urlId: string;
    url: string;
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'skipped';
    httpStatus?: number | null;
    responseTime?: number | null;
    pageTitle?: string | null;
    error?: string | null;
    attemptCount?: number;
  }) {
    const batchState = await db.execute(sql`
      SELECT status FROM batches WHERE id = ${input.batchId}::uuid
    `);
    const state = (batchState as Array<{ status?: string }>)[0]?.status;
    if (state === 'cancelled') {
      return { ok: true, skipped: true, batchId: input.batchId, urlId: input.urlId };
    }

    const insertResult = await db.execute(sql`
      INSERT INTO url_checks (
        id,
        batch_id,
        url,
        status,
        http_status,
        response_time,
        page_title,
        error,
        attempt_count,
        created_at,
        updated_at,
        completed_at
      )
      VALUES (
        ${input.urlId}::uuid,
        ${input.batchId}::uuid,
        ${input.url},
        ${input.status}::url_check_status,
        ${input.httpStatus ?? null},
        ${input.responseTime ?? null},
        ${input.pageTitle ?? null},
        ${input.error ?? null},
        ${input.attemptCount ?? 1},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (batch_id, url)
      DO UPDATE SET
        status = EXCLUDED.status,
        http_status = EXCLUDED.http_status,
        response_time = EXCLUDED.response_time,
        page_title = EXCLUDED.page_title,
        error = EXCLUDED.error,
        attempt_count = url_checks.attempt_count + 1,
        updated_at = NOW(),
        completed_at = NOW()
      WHERE EXISTS (
        SELECT 1 FROM batches WHERE batches.id = ${input.batchId}::uuid AND batches.status <> 'cancelled'
      )
      RETURNING id, batch_id, url, status, http_status, response_time, page_title, error, attempt_count;
    `);

    const completedResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM url_checks
      WHERE batch_id = ${input.batchId}::uuid AND status IN ('success', 'failed')
    `);

    const successResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM url_checks
      WHERE batch_id = ${input.batchId}::uuid AND status = 'success'
    `);

    const failedResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM url_checks
      WHERE batch_id = ${input.batchId}::uuid AND status = 'failed'
    `);

    const batchTotal = await db.execute(sql`
      SELECT total_urls::int AS total
      FROM batches
      WHERE id = ${input.batchId}::uuid
    `);

    const completedRow = (completedResult as Array<{ total?: number }>)[0];
    const successRow = (successResult as Array<{ total?: number }>)[0];
    const failedRow = (failedResult as Array<{ total?: number }>)[0];
    const batchRow = (batchTotal as Array<{ total?: number }>)[0];

    const processedCount = Number(completedRow?.total ?? 0);
    const successCount = Number(successRow?.total ?? 0);
    const failedCount = Number(failedRow?.total ?? 0);
    const totalUrls = Number(batchRow?.total ?? 0);

    const nextBatchStatus =
      processedCount >= totalUrls ? (failedCount > 0 ? 'failed' : 'completed') : 'running';

    await db.execute(sql`
      UPDATE batches
      SET
        status = ${nextBatchStatus}::batch_status,
        completed_urls = ${successCount},
        failed_urls = ${failedCount},
        updated_at = NOW(),
        completed_at = CASE WHEN ${nextBatchStatus} IN ('completed', 'failed') THEN NOW() ELSE completed_at END
      WHERE id = ${input.batchId}::uuid AND status <> 'cancelled'
    `);

    await redisConnection.del('cache:batches:list');
    await redisConnection.publish('events:batches', JSON.stringify({ batchId: input.batchId }));

    const insertRow = (insertResult as Array<Record<string, unknown>>)[0] ?? undefined;

    return {
      ok: true,
      insert: insertRow ?? null,
      batchId: input.batchId,
      urlId: input.urlId,
      url: input.url,
      status: input.status,
    };
  }
}

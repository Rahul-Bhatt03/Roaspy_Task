import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { batches } from './batches.js';

export const jobOutbox = pgTable('job_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id')
    .notNull()
    .references(() => batches.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().unique(),
  payload: jsonb('payload').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type JobOutboxRecord = typeof jobOutbox.$inferSelect;

import { pgTable, timestamp, integer, uuid, pgEnum } from 'drizzle-orm/pg-core';

export const batchStatusEnum = pgEnum('batch_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: batchStatusEnum('status').notNull().default('pending'),
  totalUrls: integer('total_urls').notNull().default(0),
  completedUrls: integer('completed_urls').notNull().default(0),
  failedUrls: integer('failed_urls').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
});

export type BatchRecord = typeof batches.$inferSelect;

import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { batches } from './batches.js';

export const urlCheckStatusEnum = pgEnum('url_check_status', [
  'pending',
  'in_progress',
  'success',
  'failed',
  'skipped',
]);

export const urlChecks = pgTable(
  'url_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    status: urlCheckStatusEnum('status').notNull().default('pending'),
    httpStatus: integer('http_status'),
    responseTime: integer('response_time'),
    pageTitle: text('page_title'),
    error: text('error'),
    attemptCount: integer('attempt_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    batchIdIdx: index('url_checks_batch_id_idx').on(table.batchId),
    urlIdx: index('url_checks_url_idx').on(table.url),
    batchUrlUnique: uniqueIndex('url_checks_batch_id_url_unique').on(table.batchId, table.url),
  }),
);

export type UrlCheckRecord = typeof urlChecks.$inferSelect;

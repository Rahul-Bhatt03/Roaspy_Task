import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import { batches } from './schema/batches.js';
import { urlChecks } from './schema/url-checks.js';
import { jobOutbox } from './schema/job-outbox.js';

const client = postgres(env.DATABASE_URL, { max: 10, ssl: 'require' });

export const db = drizzle(client, {
  schema: {
    batches,
    urlChecks,
    jobOutbox,
  },
});

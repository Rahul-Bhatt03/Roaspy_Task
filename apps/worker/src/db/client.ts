import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';

const client = postgres(env.DATABASE_URL, { max: 10, ssl: 'require' });

export const db = drizzle(client);

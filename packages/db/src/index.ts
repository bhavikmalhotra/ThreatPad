import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/threatpad';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export type Database = typeof db;
export { schema };

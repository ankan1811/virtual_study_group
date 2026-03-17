import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;

type NeonDb = ReturnType<typeof drizzle<typeof schema>>;
let _db: NeonDb | null = null;

export function getNeonDb(): NeonDb {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const sql = neon(connectionString);
    _db = drizzle(sql, { schema });
    console.log('[NeonDB] Drizzle client initialized');
  }
  return _db;
}

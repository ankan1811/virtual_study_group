import { eq, sql } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { embeddingCounters } from '../schema';

/** Atomically increments (or creates) today's counter and returns the NEW count */
export async function incrementEmbeddingCount(dateKey: string): Promise<number> {
  const db = getNeonDb();
  const [row] = await db
    .insert(embeddingCounters)
    .values({ dateKey, count: 1 })
    .onConflictDoUpdate({
      target: embeddingCounters.dateKey,
      set: { count: sql`${embeddingCounters.count} + 1` },
    })
    .returning({ count: embeddingCounters.count });
  return row.count;
}

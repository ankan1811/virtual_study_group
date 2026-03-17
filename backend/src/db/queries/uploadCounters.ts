import { eq, and, sql } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { uploadCounters } from '../schema';

/** Returns current count for this user+month, or 0 if none */
export async function getUploadCount(userId: string, monthKey: string): Promise<number> {
  const db = getNeonDb();
  const [row] = await db
    .select({ count: uploadCounters.count })
    .from(uploadCounters)
    .where(and(eq(uploadCounters.userId, userId), eq(uploadCounters.monthKey, monthKey)))
    .limit(1);
  return row?.count ?? 0;
}

/** Atomically increments (or creates) the counter and returns the NEW count */
export async function incrementUploadCount(userId: string, monthKey: string): Promise<number> {
  const db = getNeonDb();
  const [row] = await db
    .insert(uploadCounters)
    .values({ userId, monthKey, count: 1 })
    .onConflictDoUpdate({
      target: [uploadCounters.userId, uploadCounters.monthKey],
      set: { count: sql`${uploadCounters.count} + 1` },
    })
    .returning({ count: uploadCounters.count });
  return row.count;
}

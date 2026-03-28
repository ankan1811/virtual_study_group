import { getRedis } from '../db/redis';

export const MAX_DAILY_CALL_SECONDS = 3600; // 1 hour

function getKey(userId: string): string {
  const dayKey = new Date().toISOString().slice(0, 10); // "2026-03-28"
  return `call_usage:${userId}:${dayKey}`;
}

/** Returns cumulative seconds used today (0 if no record). */
export async function getCallUsage(userId: string): Promise<number> {
  const redis = getRedis();
  const val = await redis.get<number>(getKey(userId));
  return val ?? 0;
}

/** Atomically adds deltaSeconds to today's usage. Sets 24h TTL on first write. Returns new total. */
export async function incrementCallUsage(userId: string, deltaSeconds: number): Promise<number> {
  const redis = getRedis();
  const key = getKey(userId);
  const newTotal = await redis.incrby(key, deltaSeconds);
  const ttl = await redis.ttl(key);
  if (ttl === -1) {
    await redis.expire(key, 86400);
  }
  return newTotal;
}

/** Returns seconds remaining in today's quota (floored at 0). */
export async function getRemainingSeconds(userId: string): Promise<number> {
  const used = await getCallUsage(userId);
  return Math.max(0, MAX_DAILY_CALL_SECONDS - used);
}

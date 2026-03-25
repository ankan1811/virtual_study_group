import { getRedis } from '../redis';

/** Atomically increments today's embedding counter and returns the NEW count */
export async function incrementEmbeddingCount(dateKey: string): Promise<number> {
  const redis = getRedis();
  const key = `embeddings:${dateKey}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 86400);
  }
  return count;
}

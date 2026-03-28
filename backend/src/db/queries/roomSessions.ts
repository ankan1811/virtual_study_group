import { eq, gt, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getNeonDb } from '../neon';
import { roomSessions } from '../schema';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function getActiveSession(ownerId: string) {
  const db = getNeonDb();
  const [row] = await db
    .select()
    .from(roomSessions)
    .where(eq(roomSessions.ownerId, ownerId))
    .orderBy(desc(roomSessions.createdAt))
    .limit(1);
  if (row && row.expiresAt > new Date()) return row;
  return null;
}

export async function createSession(ownerId: string) {
  const db = getNeonDb();
  const roomId = `user_${ownerId}_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [row] = await db
    .insert(roomSessions)
    .values({ ownerId, roomId, expiresAt })
    .returning();
  return row;
}

export async function getOrCreateSession(ownerId: string) {
  const active = await getActiveSession(ownerId);
  if (active) return active;
  return createSession(ownerId);
}

export async function getAllSessions(ownerId: string) {
  const db = getNeonDb();
  return db
    .select()
    .from(roomSessions)
    .where(eq(roomSessions.ownerId, ownerId))
    .orderBy(desc(roomSessions.createdAt));
}

export async function getSessionByRoomId(roomId: string) {
  const db = getNeonDb();
  const [row] = await db
    .select()
    .from(roomSessions)
    .where(eq(roomSessions.roomId, roomId))
    .limit(1);
  return row;
}

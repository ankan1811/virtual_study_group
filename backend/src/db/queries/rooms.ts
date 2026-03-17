import { eq } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { rooms, roomMembers, users } from '../schema';

export async function createRoom() {
  const db = getNeonDb();
  const [row] = await db.insert(rooms).values({}).returning();
  return row;
}

export async function findRoomById(id: string) {
  const db = getNeonDb();
  const [row] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return row;
}

export async function addUserToRoom(roomId: string, userId: string) {
  const db = getNeonDb();
  await db
    .insert(roomMembers)
    .values({ roomId, userId })
    .onConflictDoNothing();
}

export async function getUsersInRoom(roomId: string) {
  const db = getNeonDb();
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(roomMembers)
    .innerJoin(users, eq(roomMembers.userId, users.id))
    .where(eq(roomMembers.roomId, roomId));
}

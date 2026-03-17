import { eq } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { chats } from '../schema';

interface ChatDoc {
  sendById: string;
  senderName: string;
  message: string;
  roomId: string;
  sessionId: string;
}

export async function bulkInsertChats(docs: ChatDoc[]) {
  if (docs.length === 0) return;
  const db = getNeonDb();
  await db.insert(chats).values(docs);
}

export async function getChatsByRoom(roomId: string) {
  const db = getNeonDb();
  return db.select().from(chats).where(eq(chats.roomId, roomId));
}

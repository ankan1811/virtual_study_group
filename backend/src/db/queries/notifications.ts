import { eq, and, lt, desc } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { notifications, type notificationTypeEnum } from '../schema';

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export async function createNotification(data: {
  recipientId: string;
  type: NotificationType;
  fromUserId: string;
  fromUserName: string;
  notifData?: Record<string, any>;
}) {
  const db = getNeonDb();
  const [row] = await db
    .insert(notifications)
    .values({
      recipientId: data.recipientId,
      type: data.type,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      data: data.notifData ?? null,
    })
    .returning();
  return row;
}

export async function listByRecipient(recipientId: string) {
  const db = getNeonDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, recipientId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markRead(id: string, recipientId: string) {
  const db = getNeonDb();
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId)));
}

export async function markAllRead(recipientId: string) {
  const db = getNeonDb();
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.recipientId, recipientId), eq(notifications.read, false)));
}

export async function deleteById(id: string, recipientId: string) {
  const db = getNeonDb();
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId)));
}

/** Delete notifications older than 10 days — replaces MongoDB TTL index */
export async function deleteExpiredNotifications(): Promise<number> {
  const db = getNeonDb();
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(notifications)
    .where(lt(notifications.createdAt, cutoff))
    .returning({ id: notifications.id });
  return rows.length;
}

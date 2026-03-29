import { eq, or, and, asc, desc, sql } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { directMessages, users } from '../schema';

export async function createDm(fromId: string, toId: string, content: string) {
  const db = getNeonDb();
  const [row] = await db
    .insert(directMessages)
    .values({ fromId, toId, content })
    .returning();
  return row;
}

/** Last 50 messages between two users, oldest first, with sender name */
export async function getDmHistory(userId: string, companionId: string) {
  const db = getNeonDb();
  const senderAlias = users;
  const rows = await db
    .select({
      id: directMessages.id,
      fromId: directMessages.fromId,
      fromName: senderAlias.name,
      content: directMessages.content,
      createdAt: directMessages.createdAt,
      read: directMessages.read,
    })
    .from(directMessages)
    .innerJoin(senderAlias, eq(directMessages.fromId, senderAlias.id))
    .where(
      or(
        and(eq(directMessages.fromId, userId), eq(directMessages.toId, companionId)),
        and(eq(directMessages.fromId, companionId), eq(directMessages.toId, userId)),
      ),
    )
    .orderBy(asc(directMessages.createdAt))
    .limit(50);
  return rows;
}

/**
 * WhatsApp-style recent chat list — one row per companion, latest message,
 * unread count. Uses a CTE + window function, equivalent to the MongoDB
 * aggregation pipeline in the original DmController.
 */
export async function getRecentChats(userId: string) {
  const db = getNeonDb();

  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        CASE WHEN from_id = ${userId}::uuid THEN to_id ELSE from_id END AS companion_id,
        content,
        created_at,
        (from_id = ${userId}::uuid) AS is_mine,
        ROW_NUMBER() OVER (
          PARTITION BY CASE WHEN from_id = ${userId}::uuid THEN to_id ELSE from_id END
          ORDER BY created_at DESC
        ) AS rn
      FROM direct_messages
      WHERE from_id = ${userId}::uuid OR to_id = ${userId}::uuid
    ),
    unread_counts AS (
      SELECT from_id AS companion_id, COUNT(*)::int AS unread_count
      FROM direct_messages
      WHERE to_id = ${userId}::uuid AND read = false
      GROUP BY from_id
    )
    SELECT
      r.companion_id::text,
      u.name AS companion_name,
      r.content AS last_message,
      r.created_at AS last_message_at,
      r.is_mine,
      COALESCE(uc.unread_count, 0) AS unread_count
    FROM ranked r
    LEFT JOIN users u ON u.id = r.companion_id
    LEFT JOIN unread_counts uc ON uc.companion_id = r.companion_id
    WHERE r.rn = 1
    ORDER BY r.created_at DESC
    LIMIT 50
  `);

  return (result.rows as any[]).map((r) => ({
    companionId: r.companion_id as string,
    companionName: (r.companion_name as string) || 'Unknown',
    lastMessage: r.last_message as string,
    lastMessageAt: r.last_message_at as Date,
    unreadCount: Number(r.unread_count),
    isMine: r.is_mine as boolean,
  }));
}

/** Returns unread message counts grouped by sender (for badge restore on refresh) */
export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
  const db = getNeonDb();
  const rows = await db
    .select({
      fromId: directMessages.fromId,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(directMessages)
    .where(and(eq(directMessages.toId, userId), eq(directMessages.read, false)))
    .groupBy(directMessages.fromId);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.fromId] = row.count;
  }
  return counts;
}

/** Marks all messages FROM a companion TO userId as read; returns count modified */
export async function markDmRead(fromId: string, toId: string): Promise<number> {
  const db = getNeonDb();
  const rows = await db
    .update(directMessages)
    .set({ read: true, updatedAt: new Date() })
    .where(
      and(
        eq(directMessages.fromId, fromId),
        eq(directMessages.toId, toId),
        eq(directMessages.read, false),
      ),
    )
    .returning({ id: directMessages.id });
  return rows.length;
}

/** Fetch messages for DM summary (last 100, oldest first, with sender name) */
export async function getDmTranscript(userA: string, userB: string) {
  const db = getNeonDb();
  const senderAlias = users;
  const rows = await db
    .select({
      fromName: senderAlias.name,
      content: directMessages.content,
    })
    .from(directMessages)
    .innerJoin(senderAlias, eq(directMessages.fromId, senderAlias.id))
    .where(
      or(
        and(eq(directMessages.fromId, userA), eq(directMessages.toId, userB)),
        and(eq(directMessages.fromId, userB), eq(directMessages.toId, userA)),
      ),
    )
    .orderBy(asc(directMessages.createdAt))
    .limit(100);
  return rows;
}

import { eq, or, and } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { companions, users } from '../schema';

/** Find a companion relationship in either direction */
export async function findCompanionPair(userA: string, userB: string) {
  const db = getNeonDb();
  const [row] = await db
    .select()
    .from(companions)
    .where(
      or(
        and(eq(companions.requesterId, userA), eq(companions.recipientId, userB)),
        and(eq(companions.requesterId, userB), eq(companions.recipientId, userA)),
      ),
    )
    .limit(1);
  return row;
}

export async function createCompanion(requesterId: string, recipientId: string) {
  const db = getNeonDb();
  const [row] = await db
    .insert(companions)
    .values({ requesterId, recipientId, status: 'pending' })
    .returning();
  return row;
}

export async function acceptCompanionRequest(requesterId: string, recipientId: string) {
  const db = getNeonDb();
  await db
    .update(companions)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(
      and(
        eq(companions.requesterId, requesterId),
        eq(companions.recipientId, recipientId),
        eq(companions.status, 'pending'),
      ),
    );
}

export async function deleteCompanion(requesterId: string, recipientId: string) {
  const db = getNeonDb();
  await db
    .delete(companions)
    .where(
      and(eq(companions.requesterId, requesterId), eq(companions.recipientId, recipientId)),
    );
}

/** Returns all accepted companions with their name */
export async function listAcceptedCompanions(userId: string) {
  const db = getNeonDb();
  const rows = await db
    .select({
      requesterId: companions.requesterId,
      recipientId: companions.recipientId,
      requesterName: users.name,
    })
    .from(companions)
    .innerJoin(
      users,
      or(
        and(eq(companions.requesterId, userId), eq(users.id, companions.recipientId)),
        and(eq(companions.recipientId, userId), eq(users.id, companions.requesterId)),
      ),
    )
    .where(
      and(
        or(eq(companions.requesterId, userId), eq(companions.recipientId, userId)),
        eq(companions.status, 'accepted'),
      ),
    );

  return rows.map((r) => ({
    userId: r.requesterId === userId ? r.recipientId : r.requesterId,
    name: r.requesterName,
  }));
}

/** Returns pending requests addressed TO userId, with requester name */
export async function getPendingRequests(userId: string) {
  const db = getNeonDb();
  // Alias: join users on requester side
  const requesterAlias = users;
  const rows = await db
    .select({
      requesterId: companions.requesterId,
      requesterName: requesterAlias.name,
    })
    .from(companions)
    .innerJoin(requesterAlias, eq(companions.requesterId, requesterAlias.id))
    .where(
      and(eq(companions.recipientId, userId), eq(companions.status, 'pending')),
    );
  return rows;
}

export async function countAcceptedCompanions(userId: string): Promise<number> {
  const db = getNeonDb();
  const rows = await db
    .select({ id: companions.id })
    .from(companions)
    .where(
      and(
        or(eq(companions.requesterId, userId), eq(companions.recipientId, userId)),
        eq(companions.status, 'accepted'),
      ),
    );
  return rows.length;
}

export async function getAcceptedCompanionIds(userId: string): Promise<string[]> {
  const db = getNeonDb();
  const rows = await db
    .select({ requesterId: companions.requesterId, recipientId: companions.recipientId })
    .from(companions)
    .where(
      and(
        or(eq(companions.requesterId, userId), eq(companions.recipientId, userId)),
        eq(companions.status, 'accepted'),
      ),
    );
  return rows.map((r) => (r.requesterId === userId ? r.recipientId : r.requesterId));
}

export async function checkCompanionship(userA: string, userB: string): Promise<boolean> {
  const db = getNeonDb();
  const [row] = await db
    .select({ id: companions.id })
    .from(companions)
    .where(
      and(
        or(
          and(eq(companions.requesterId, userA), eq(companions.recipientId, userB)),
          and(eq(companions.requesterId, userB), eq(companions.recipientId, userA)),
        ),
        eq(companions.status, 'accepted'),
      ),
    )
    .limit(1);
  return !!row;
}

import { eq, ne, ilike, or } from 'drizzle-orm';
import { getNeonDb } from '../neon';
import { users, type NewUser } from '../schema';

export async function findByEmail(email: string) {
  const db = getNeonDb();
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return row;
}

export async function findById(id: string) {
  const db = getNeonDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function createUser(data: { name: string; email: string; googleId?: string }) {
  const db = getNeonDb();
  const [row] = await db
    .insert(users)
    .values({ name: data.name, email: data.email.toLowerCase(), googleId: data.googleId })
    .returning();
  return row;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<NewUser, 'name' | 'bio' | 'avatar' | 'googleId' | 'education' | 'projects' | 'workExperience'>>,
) {
  const db = getNeonDb();
  const [row] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row;
}

export async function searchUsers(q: string, excludeId: string) {
  const db = getNeonDb();
  const term = `%${q.trim()}%`;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      or(
        ilike(users.name, term),
        ilike(users.email, term),
      ),
    )
    .limit(10);
  return rows.filter((u) => u.id !== excludeId);
}

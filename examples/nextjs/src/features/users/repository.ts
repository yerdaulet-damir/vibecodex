/**
 * Drizzle adapter for UsersRepoProtocol.
 *
 * This is the ONLY file in the users feature that imports drizzle-orm.
 * Server Actions and components consume the Protocol, not this concrete impl.
 */

import 'server-only';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { users, type User, type NewUser } from '@/lib/db/schema';
import type { UsersRepoProtocol } from './protocols';

class DrizzleUsersRepo implements UsersRepoProtocol {
  async byId(id: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async byEmail(email: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async list(limit: number): Promise<User[]> {
    return db.select().from(users).limit(limit);
  }

  async create(input: NewUser): Promise<User> {
    const [row] = await db.insert(users).values(input).returning();
    if (!row) throw new Error('Failed to insert user');
    return row;
  }

  async update(id: string, patch: Partial<NewUser>): Promise<User> {
    const [row] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!row) throw new Error(`User ${id} not found`);
    return row;
  }
}

export const usersRepo: UsersRepoProtocol = new DrizzleUsersRepo();

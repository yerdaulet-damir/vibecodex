/**
 * Hexagonal boundary for the users domain — TypeScript Protocol equivalent.
 * Services depend on this interface, never on `drizzle-orm`.
 *
 * Mirror of FastAPI Principle B1 (Hexagonal / Ports & Adapters).
 */

import type { User, NewUser } from '@/lib/db/schema';

export interface UsersRepoProtocol {
  byId(id: string): Promise<User | null>;
  byEmail(email: string): Promise<User | null>;
  list(limit: number): Promise<User[]>;
  create(input: NewUser): Promise<User>;
  update(id: string, patch: Partial<NewUser>): Promise<User>;
}

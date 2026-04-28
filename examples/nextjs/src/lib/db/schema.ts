/**
 * Drizzle schema — Principle D6.
 *
 * TypeScript IS the schema. Types are inferred via `$inferSelect` / `$inferInsert`.
 * No codegen step. No `.prisma` DSL. Migrations via `drizzle-kit generate`.
 */

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

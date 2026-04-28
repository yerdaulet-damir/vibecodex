/**
 * Server Actions for the users domain.
 *
 * Demonstrates:
 *   - Principle C5: Server Actions for mutations + errors-as-values
 *   - Principle D1: typed cache-tag DSL — no magic strings
 *   - Principle C8: Zod validation at the boundary
 *   - Hexagonal: imports usersRepo via Protocol
 */

'use server';

import { revalidateTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';
import { usersRepo } from './repository';
import {
  CreateUserSchema,
  UpdateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from './schema';
import type { User } from '@/lib/db/schema';

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function createUser(input: CreateUserInput): Promise<Result<User>> {
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const existing = await usersRepo.byEmail(parsed.data.email);
  if (existing) {
    return { success: false, error: 'Email already in use' };
  }

  const user = await usersRepo.create(parsed.data);

  // Cache invalidation via typed DSL — typo = compile error
  revalidateTag(tags.userList());
  revalidateTag(tags.user(user.id));

  return { success: true, data: user };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<Result<User>> {
  const parsed = UpdateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const user = await usersRepo.update(id, parsed.data);

  // Atomic invalidation of every tag the mutation affects
  revalidateTag(tags.user(id));
  revalidateTag(tags.userList());
  revalidateTag(tags.userOrders(id));

  return { success: true, data: user };
}

/**
 * Read function — tag the fetch so it can be invalidated by name later.
 * Note: in a real app this would be wrapped in `unstable_cache` or `fetch`
 * with `next: { tags: [...] }`. This shape demonstrates the pattern.
 */
export async function getUser(id: string): Promise<User | null> {
  return usersRepo.byId(id);
}

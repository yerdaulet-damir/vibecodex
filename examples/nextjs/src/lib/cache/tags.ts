/**
 * Typed cache-tag DSL — Principle D1.
 *
 * Single source of truth for every cache invalidation in the app.
 * Magic strings forbidden: every `revalidateTag(...)` call goes through here.
 *
 * Adding a new tag? Add it here first, then import. TypeScript catches typos.
 */

export const tags = {
  // User domain
  user: (id: string) => `user:${id}` as const,
  userList: () => 'user:list' as const,
  userOrders: (userId: string) => `user:${userId}:orders` as const,

  // Product domain
  product: (id: string) => `product:${id}` as const,
  productList: () => 'product:list' as const,

  // Cart domain (per user)
  cart: (userId: string) => `cart:${userId}` as const,

  // Session — invalidated on login/logout
  session: (userId: string) => `session:${userId}` as const,
} as const;

/** Union type of all valid tag values — useful for explicit typing. */
export type Tag = ReturnType<(typeof tags)[keyof typeof tags]>;

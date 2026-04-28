/**
 * Client Component using React 19 `use()` to unwrap a server Promise.
 *
 * Principle D2: no useEffect, no loading flag — Suspense handles it.
 * Principle C4: 'use client' at the leaf, not the page.
 */

'use client';

import { use } from 'react';
import type { User } from '@/lib/db/schema';

interface UserListProps {
  usersPromise: Promise<User[]>;
}

export function UserList({ usersPromise }: UserListProps) {
  const users = use(usersPromise);

  if (users.length === 0) {
    return <p className="text-muted-foreground">No users yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {users.map((user) => (
        <li key={user.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

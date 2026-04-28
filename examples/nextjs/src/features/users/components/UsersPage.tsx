/**
 * Server Component — feature-level page (Principles C2 + C4).
 *
 * `app/users/page.tsx` is a thin orchestrator that imports this component.
 * All UI for the users feature lives here, in the feature folder.
 */

import { Suspense } from 'react';
import { UserList } from './UserList';
import { UserListSkeleton } from './UserListSkeleton';
import type { User } from '@/lib/db/schema';

interface UsersPageProps {
  usersPromise: Promise<User[]>;
}

export function UsersPage({ usersPromise }: UsersPageProps) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Users</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList usersPromise={usersPromise} />
      </Suspense>
    </main>
  );
}

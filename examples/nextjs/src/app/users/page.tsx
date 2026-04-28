/**
 * Thin orchestrator — Principle C2.
 *
 * Page file under 20 lines. All UI lives in features/users/components/UsersPage.tsx.
 */

import { UsersPage } from '@/features/users/components/UsersPage';
import { usersRepo } from '@/features/users/repository';

export const experimental_ppr = true; // Principle D4

export default function Page() {
  // Don't await — pass the Promise down so Suspense can stream it (Principle D3).
  const usersPromise = usersRepo.list(50);
  return <UsersPage usersPromise={usersPromise} />;
}

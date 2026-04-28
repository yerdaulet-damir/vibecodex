/**
 * Server-only session helper — Principle D5.
 *
 * Read the session from Server Components, dedupe within a request via React.cache().
 * Middleware should NOT call this — middleware is for redirects only.
 */

import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';

// Better Auth instance is configured in lib/auth/config.ts in a real app.
// Stub here so the example compiles without external auth setup.
type Session = { user: { id: string; email: string; name: string } } | null;

async function readSessionFromAuthProvider(_h: Headers): Promise<Session> {
  // Real implementation:
  //   import { auth } from '@/lib/auth/config';
  //   return auth.api.getSession({ headers });
  return null;
}

export const getSession = cache(async (): Promise<Session> => {
  const h = await headers();
  return readSessionFromAuthProvider(h);
});

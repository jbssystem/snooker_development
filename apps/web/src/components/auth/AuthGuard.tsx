'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { refreshAccessToken } from '@/lib/api-client';

/**
 * Client-side route guard for the authenticated `(app)` section.
 *
 * Auth state lives only in the zustand store, so the server can't gate these
 * routes. The access token is held in memory only (never persisted), so on a
 * page reload there is no token yet — only the persisted `user` summary, whose
 * presence means "this browser had a session".
 *
 * Flow on mount:
 *  1. Wait for the persisted store to finish hydrating.
 *  2. If an in-memory token already exists (e.g. just logged in) → render.
 *  3. Else, if the user had a session, mint a fresh access token from the
 *     httpOnly `snooker_refresh` cookie via `/auth/refresh`. On success render;
 *     on failure clear and redirect to `/login`.
 *  4. If the user never had a session → redirect to `/login`.
 *
 * A neutral spinner shows until this resolves, so a logged-in reload never
 * flashes the login redirect (and there's no hydration mismatch — both server
 * and first client render start in the spinner state).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const hadSession = useAuthStore((s) => Boolean(s.user));
  const clear = useAuthStore((s) => s.clear);
  // Always start `false` so server and first client render agree (no hydration
  // mismatch); the effect flips it once the persisted store has rehydrated.
  const [hydrated, setHydrated] = useState(false);
  // Tracks the one-shot refresh-on-load attempt. Stays `true` (spinner) until we
  // know whether we have a usable session.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Already have an in-memory token (fresh login, or refresh just landed).
    if (token) {
      setChecking(false);
      return;
    }

    // Reload with a remembered session: try to restore a token from the cookie.
    if (hadSession) {
      let cancelled = false;
      void (async () => {
        const tokens = await refreshAccessToken();
        if (cancelled) return;
        if (!tokens) {
          clear();
          router.replace('/login');
        }
        // On success `refreshAccessToken` already put the token in the store,
        // which re-runs this effect and renders the children.
        setChecking(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    // No token and never authenticated → straight to login.
    setChecking(false);
    router.replace('/login');
  }, [hydrated, token, hadSession, clear, router]);

  if (!hydrated || checking || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-hidden>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-brand-accent" />
      </div>
    );
  }

  return <>{children}</>;
}

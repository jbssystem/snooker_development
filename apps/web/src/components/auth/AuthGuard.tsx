'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Client-side route guard for the authenticated `(app)` section.
 *
 * Auth state lives only in the zustand store (persisted to localStorage), so the
 * server can't gate these routes. This component waits for the persisted store to
 * finish hydrating, then redirects unauthenticated visitors to the login page
 * instead of rendering protected content. Until hydration completes (and while a
 * redirect is in flight) it renders a neutral placeholder so a logged-in user
 * reloading the page never flashes the login redirect.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  // Always start `false` so server and first client render agree (no hydration
  // mismatch); the effect flips it once the persisted store has rehydrated.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-hidden>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-brand-accent" />
      </div>
    );
  }

  return <>{children}</>;
}

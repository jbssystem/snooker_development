import type { Page } from '@playwright/test';
import { adminUser } from './fixtures';

// NOTE: real-API login for the `e2e` project lives in `session.ts` + the
// per-worker `authedContext` fixture in `test-base.ts`.

/**
 * Seed a "remembered session" for the mocked `smoke` project.
 *
 * SECURITY: the access token is no longer persisted to localStorage — it lives
 * only in memory. So we can't seed a token here. Instead we seed only the
 * persisted `user` summary (the "was authenticated" signal). On load, AuthGuard
 * calls `/auth/refresh` to obtain an in-memory access token; `mockApi` answers
 * that with `fx.authTokens`, so protected pages render without a login flow.
 *
 * The persisted shape is zustand-persist v3: { state: { user }, version }.
 */
export async function seedAuth(page: Page): Promise<void> {
  const value = JSON.stringify({
    state: { user: adminUser },
    version: 3,
  });
  await page.addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val);
    },
    ['snooker.auth', value] as const,
  );
}

import type { Page } from '@playwright/test';
import { adminUser, authTokens } from './fixtures';

// NOTE: real-API login for the `e2e` project lives in `global.setup.ts`
// (runs once and reuses the session via storageState).

/**
 * Route protection in this app is client-side: data queries are gated on
 * `Boolean(token)` from the zustand auth store (persisted to localStorage as
 * `snooker.auth`). Seeding that key before the page loads makes protected
 * pages render without going through the login flow.
 *
 * The persisted shape is zustand-persist v2: { state: { user, tokens }, version }.
 */
export async function seedAuth(page: Page): Promise<void> {
  const value = JSON.stringify({
    state: { user: adminUser, tokens: authTokens },
    version: 2,
  });
  await page.addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val);
    },
    ['snooker.auth', value] as const,
  );
}

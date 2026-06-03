import type { Page } from '@playwright/test';
import { adminUser, authTokens } from './fixtures';

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

/**
 * Real login against a running API (used by the `e2e` project). Reads
 * credentials from env (ADMIN_EMAIL / ADMIN_PASSWORD), logs in via the API,
 * and seeds the resulting tokens into localStorage.
 */
export async function seedRealAuth(
  page: Page,
  apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
): Promise<void> {
  const email = process.env.ADMIN_EMAIL || 'admin@snooker.appshub.pl';
  const password = process.env.ADMIN_PASSWORD || 'change-me-admin';

  const res = await page.request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(
      `Real login failed (${res.status()}). Is the API running on ${apiBase} and seeded? ` +
        `Set ADMIN_EMAIL / ADMIN_PASSWORD if needed.`,
    );
  }
  const session = (await res.json()) as { user: unknown; tokens: unknown };
  const value = JSON.stringify({
    state: { user: session.user, tokens: session.tokens },
    version: 2,
  });
  await page.addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val);
    },
    ['snooker.auth', value] as const,
  );
}

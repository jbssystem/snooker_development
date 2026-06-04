import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Real-API login helper for the `e2e` project, used by the per-worker auth
 * fixture in `test-base.ts`.
 *
 * Since the access token is no longer persisted (it lives in memory only), the
 * browser restores a session on load by calling `/auth/refresh` with the
 * httpOnly `snooker_refresh` cookie. That refresh token is single-use (rotated
 * on every refresh), so a single shared token can't be replayed across many
 * parallel browser contexts. Instead each Playwright worker logs in once and
 * reuses one context (see `test-base.ts`), so the rotation chains forward.
 *
 * Returns a Playwright storageState carrying:
 *  - localStorage `snooker.auth` with only the `user` summary (persist v3), the
 *    "was authenticated" signal AuthGuard needs to attempt refresh-on-load;
 *  - the `snooker_refresh` cookie set by the login response.
 */
export type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export async function buildLoggedInStorageState(request: APIRequestContext): Promise<StorageState> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const email = process.env.ADMIN_EMAIL || 'admin@snooker.appshub.pl';
  const password = process.env.ADMIN_PASSWORD || 'change-me-admin';

  const res = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(
    res.ok(),
    `Real login failed (${res.status()}). Is the API on ${apiBase} seeded with an admin? ` +
      `Set ADMIN_EMAIL / ADMIN_PASSWORD if needed.`,
  ).toBeTruthy();

  const session = (await res.json()) as { user: unknown };
  const value = JSON.stringify({ state: { user: session.user }, version: 3 });

  // The login response set the httpOnly refresh cookie on this request context.
  const reqState = await request.storageState();

  return {
    cookies: reqState.cookies,
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [{ name: 'snooker.auth', value }],
      },
    ],
  };
}

import { test, expect } from '../support/test-base';

/**
 * Route protection: the authenticated `(app)` section is gated client-side by
 * <AuthGuard>. An unauthenticated visitor opening a protected URL directly must
 * be redirected to the login page instead of seeing the protected content.
 */

const LOCALE = 'en';
const protectedPaths = ['dashboard', 'drills', 'profile', 'matches', 'analytics'];

test.describe('unauthenticated access is redirected to login', () => {
  test.use({ auth: false });

  for (const path of protectedPaths) {
    test(`/${path} → /login`, async ({ page }) => {
      await page.goto(`/${LOCALE}/${path}`);

      // The guard replaces the route with the login page once the (empty) auth
      // store has hydrated.
      await page.waitForURL(`**/${LOCALE}/login`);
      await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login$`));
      await expect(page.getByText(/sign in/i).first()).toBeVisible();
    });
  }
});

/**
 * Security regression guard for the in-memory-access-token model.
 *
 * The access token is never persisted; on load the guard mints a fresh one
 * from the httpOnly refresh cookie (mocked in `smoke`, real in `e2e`). A
 * remembered session must therefore survive a reload without bouncing to
 * /login, and the token must never appear in localStorage.
 */
test.describe('a remembered session refreshes on load', () => {
  test('reloading a protected page restores the session without redirect', async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);

    // The guard refreshes-on-load instead of redirecting to /login.
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/dashboard$`));
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/dashboard$`));
  });

  test('the access token is never written to localStorage', async ({ page }) => {
    await page.goto(`/${LOCALE}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/dashboard$`));
    await page.waitForLoadState('networkidle');

    const persisted = await page.evaluate(() => window.localStorage.getItem('snooker.auth'));
    expect(persisted, 'snooker.auth should still hold the remembered user').toBeTruthy();
    const parsed = JSON.parse(persisted as string) as { state?: { tokens?: unknown } };
    // Only the user summary is persisted — the JWT lives in memory only.
    expect(parsed.state?.tokens ?? null).toBeNull();
  });
});

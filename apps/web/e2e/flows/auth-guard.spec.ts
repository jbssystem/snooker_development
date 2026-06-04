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

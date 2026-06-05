import { test, expect, filterErrors } from '../support/test-base';

/**
 * Smoke coverage: every main route should render its header, show a heading,
 * and produce no console / page errors. This is the "did anything break"
 * safety net for the whole app.
 *
 * Text is asserted in English (locale `/en`) against strings from
 * apps/web/messages/en.json.
 */

const LOCALE = 'en';

type RouteCase = { path: string; title: string };

const protectedRoutes: RouteCase[] = [
  { path: 'dashboard', title: 'Dashboard' },
  { path: 'drills', title: 'Drill library' },
  { path: 'training', title: 'Training' },
  { path: 'matches', title: 'Matches' },
  { path: 'calendar', title: 'Factor calendar' },
  { path: 'profile', title: 'Player profile' },
  { path: 'analytics', title: 'Analytics' },
  { path: 'ai', title: 'AI Coach' },
  { path: 'external-data', title: 'External Data' },
  { path: 'admin', title: 'Administration' },
  { path: 'admin/users', title: 'Administration' },
  { path: 'admin/announcements', title: 'Administration' },
  { path: 'admin/exercises', title: 'Administration' },
  { path: 'admin/stats', title: 'Administration' },
  { path: 'admin/ai-focus-presets', title: 'Administration' },
];

test.describe('protected pages render', () => {
  for (const { path, title } of protectedRoutes) {
    test(`/${path}`, async ({ page, consoleErrors }) => {
      await page.goto(`/${LOCALE}/${path}`);
      await page.waitForLoadState('networkidle');

      // Page produced a heading (i.e. it actually rendered content).
      await expect(page.getByRole('heading').first()).toBeVisible();
      // Expected title text is present somewhere on the page (case-insensitive).
      await expect(page.getByText(titleRe(title)).first()).toBeVisible();

      expect(filterErrors(consoleErrors), `console errors on /${path}`).toEqual([]);
    });
  }
});

function titleRe(title: string): RegExp {
  return new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

test.describe('public pages render', () => {
  test.use({ auth: false });

  const publicRoutes: RouteCase[] = [
    { path: 'login', title: 'Sign in' },
    { path: 'register', title: 'Create account' },
  ];

  for (const { path, title } of publicRoutes) {
    test(`/${path}`, async ({ page, consoleErrors }) => {
      await page.goto(`/${LOCALE}/${path}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByText(titleRe(title)).first()).toBeVisible();

      expect(filterErrors(consoleErrors), `console errors on /${path}`).toEqual([]);
    });
  }
});

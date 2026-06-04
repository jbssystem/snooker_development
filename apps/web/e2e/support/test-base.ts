import {
  test as base,
  expect,
  request as apiRequest,
  type Page,
  type BrowserContext,
} from '@playwright/test';
import { mockApi } from './mockApi';
import { seedAuth } from './auth';
import { buildLoggedInStorageState, type StorageState } from './session';

/**
 * Shared test base.
 *
 * Behaviour depends on the Playwright project:
 *  - `smoke`: API is mocked and a fake admin "remembered session" is seeded
 *    (unless the test opts out with `test.use({ auth: false })`, e.g.
 *    login/register). AuthGuard refreshes-on-load against the mocked
 *    `/auth/refresh` to obtain an in-memory token.
 *  - `e2e`:   no mocks; the real session is created by a **per-worker** login.
 *    The access token is in memory only and the refresh token is single-use, so
 *    each worker logs in once and shares one browser context across its tests —
 *    the refresh token then rotates forward instead of being replayed across
 *    isolated contexts. `auth: false` tests use a fresh logged-out context.
 *
 * Every test also gets a `consoleErrors` array that collects browser
 * console.error / uncaught page errors, so a test can assert the page loaded
 * cleanly.
 */
type Options = { auth: boolean };
type TestFixtures = { consoleErrors: string[] };
// Worker-scoped: one real login + one shared logged-in context per worker
// (`null` for the mocked `smoke` project).
type WorkerFixtures = { authedContext: BrowserContext | null };

// Benign noise we don't want to fail on.
const IGNORED_ERRORS = [
  'favicon',
  'Download the React DevTools',
  'ResizeObserver loop',
  'Failed to load resource',
];

export function filterErrors(errors: string[]): string[] {
  return errors.filter((e) => !IGNORED_ERRORS.some((ignored) => e.includes(ignored)));
}

export const test = base.extend<Options & TestFixtures, WorkerFixtures>({
  auth: [true, { option: true }],

  authedContext: [
    async ({ browser }, use, workerInfo) => {
      if (workerInfo.project.name !== 'e2e') {
        await use(null);
        return;
      }
      // One real login per worker (keeps us well under the /auth/login rate
      // limit — see the capped --workers in the test:ui:e2e script).
      const api = await apiRequest.newContext();
      let storageState: StorageState;
      try {
        storageState = await buildLoggedInStorageState(api);
      } finally {
        await api.dispose();
      }
      const context = await browser.newContext({ storageState });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  page: async ({ page, auth, authedContext }, use, testInfo) => {
    const isE2E = testInfo.project.name === 'e2e';

    if (isE2E) {
      if (auth && authedContext) {
        // Reuse the worker's logged-in context so the single-use refresh token
        // chains forward across this worker's tests. Each test gets its own tab.
        const authedPage = await authedContext.newPage();
        await use(authedPage);
        await authedPage.close();
        return;
      }
      // Logged-out e2e: a fresh isolated page with no remembered session.
      await page.addInitScript(() => window.localStorage.removeItem('snooker.auth'));
      await use(page);
      return;
    }

    await mockApi(page);
    if (auth) await seedAuth(page);
    await use(page);
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    await use(errors);
  },
});

export { expect };
export type { Page };

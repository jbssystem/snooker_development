import { test as base, expect, type Page } from '@playwright/test';
import { mockApi } from './mockApi';
import { seedAuth, seedRealAuth } from './auth';

/**
 * Shared test base.
 *
 * Behaviour depends on the Playwright project:
 *  - `smoke`: API is mocked and a fake admin session is seeded (unless the
 *    test opts out with `test.use({ auth: false })`, e.g. login/register).
 *  - `e2e`:   no mocks; logs in against the real API and seeds the token.
 *
 * Every test also gets a `consoleErrors` array that collects browser
 * console.error / uncaught page errors, so a test can assert the page loaded
 * cleanly.
 */
type Options = { auth: boolean };
type Fixtures = { consoleErrors: string[] };

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

export const test = base.extend<Options & Fixtures>({
  auth: [true, { option: true }],

  page: async ({ page, auth }, use, testInfo) => {
    const isE2E = testInfo.project.name === 'e2e';

    if (isE2E) {
      if (auth) await seedRealAuth(page);
    } else {
      await mockApi(page);
      if (auth) await seedAuth(page);
    }

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

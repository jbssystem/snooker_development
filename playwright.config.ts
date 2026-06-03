import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Snooker Player OS web UI tests.
 *
 * Two projects:
 *  - `smoke` (default): API mocked via route interception + a seeded fake auth
 *    token. Fast, deterministic, needs only the Next.js dev server — no
 *    Postgres / Redis / API. This is what `pnpm test:ui` runs.
 *  - `e2e`: hits the real backend (API on :4000) and logs in with real
 *    credentials. Run only when the full stack is up (`pnpm test:ui:e2e`).
 *
 * The web dev server is started automatically and reused if already running.
 */
const WEB_PORT = 3000;
const baseURL = `http://localhost:${WEB_PORT}`;

// Where the `e2e-setup` project stores the real-login session for reuse.
export const E2E_AUTH_FILE = '.playwright/e2e-auth.json';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Logs in once against the real API and saves the session, so e2e tests
    // don't each hit the rate-limited /auth/login endpoint.
    {
      name: 'e2e-setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'e2e',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['e2e-setup'],
      use: { ...devices['Desktop Chrome'], storageState: E2E_AUTH_FILE },
    },
  ],

  webServer: {
    command: 'pnpm dev:web',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

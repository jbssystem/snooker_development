import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { E2E_AUTH_FILE } from '../../../../playwright.config';

/**
 * One-time authentication for the `e2e` project.
 *
 * Logs in against the real API exactly once and writes a Playwright
 * storageState file (seeding `snooker.auth` into localStorage for the web
 * origin). All e2e tests reuse this — avoids hammering the rate-limited
 * /auth/login endpoint per test (which returns 429).
 */
setup('authenticate', async ({ request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const email = process.env.ADMIN_EMAIL || 'admin@snooker.appshub.pl';
  const password = process.env.ADMIN_PASSWORD || 'change-me-admin';

  const res = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(
    res.ok(),
    `Real login failed (${res.status()}). Is the API on ${apiBase} seeded with an admin? ` +
      `Set ADMIN_EMAIL / ADMIN_PASSWORD if needed.`,
  ).toBeTruthy();

  const session = (await res.json()) as { user: unknown; tokens: unknown };
  const value = JSON.stringify({
    state: { user: session.user, tokens: session.tokens },
    version: 2,
  });

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [{ name: 'snooker.auth', value }],
      },
    ],
  };

  const file = path.resolve(process.cwd(), E2E_AUTH_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(storageState));
});

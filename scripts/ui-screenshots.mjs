// Visual QA helper: logs in with the demo account and screenshots key pages at
// desktop and mobile widths into .ui-shots/ for design review.
//
// Usage:
//   node scripts/ui-screenshots.mjs                  # all pages, both viewports
//   node scripts/ui-screenshots.mjs drills training  # subset of pages
//   BASE_URL=http://127.0.0.1:3000 node scripts/ui-screenshots.mjs
//
// Env: BASE_URL, LOCALE, DEMO_EMAIL, DEMO_PASSWORD, VIEWPORTS (csv: desktop,mobile)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.LOCALE ?? 'ru';
const EMAIL = process.env.DEMO_EMAIL ?? 'customer.player.demo@snooker.local';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'CustomerDemo2026!';
const OUT_DIR = path.resolve('.ui-shots');

const ALL_PAGES = [
  'dashboard',
  'drills',
  'training',
  'matches',
  'profile',
  'calendar',
  'ai',
  'analytics',
  'external-data',
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const requestedPages = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const pages = requestedPages.length > 0 ? requestedPages : ALL_PAGES;
const requestedViewports = (process.env.VIEWPORTS ?? 'desktop,mobile')
  .split(',')
  .map((v) => v.trim())
  .filter((v) => v in VIEWPORTS);

async function login(page) {
  await page.goto(`${BASE_URL}/${LOCALE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/(dashboard)?$|\/dashboard/, { timeout: 15000 }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(1500);
}

async function shoot() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  for (const vpName of requestedViewports) {
    const context = await browser.newContext({ viewport: VIEWPORTS[vpName], deviceScaleFactor: 1 });
    const page = await context.newPage();
    await login(page);

    for (const name of pages) {
      const url = `${BASE_URL}/${LOCALE}/${name}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(1200);
        const fullPage = process.env.FULLPAGE !== '0';
        const file = path.join(OUT_DIR, `${name}-${vpName}${fullPage ? '' : '-fold'}.png`);
        await page.screenshot({ path: file, fullPage });
        results.push(`ok   ${name}-${vpName}`);
      } catch (error) {
        results.push(`FAIL ${name}-${vpName}: ${error.message.split('\n')[0]}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nScreenshots written to ${OUT_DIR}`);
  console.log(results.join('\n'));
}

shoot().catch((error) => {
  console.error(error);
  process.exit(1);
});

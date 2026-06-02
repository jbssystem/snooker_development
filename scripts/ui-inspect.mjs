// Focused element screenshots for close design review.
// Usage: node scripts/ui-inspect.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.LOCALE ?? 'ru';
const EMAIL = process.env.DEMO_EMAIL ?? 'customer.player.demo@snooker.local';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'CustomerDemo2026!';
const OUT_DIR = path.resolve('.ui-shots');

// [page, testId-or-selector, output-name]
const TARGETS = [
  ['drills', '[data-testid="drill-template-form"]', 'drill-form'],
  ['training', 'main', 'training-main'],
];

async function login(page) {
  await page.goto(`${BASE_URL}/${LOCALE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await login(page);

  const results = [];
  for (const [name, selector, out] of TARGETS) {
    await page.goto(`${BASE_URL}/${LOCALE}/${name}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    const el = page.locator(selector).first();
    try {
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: path.join(OUT_DIR, `${out}.png`) });
      results.push(`ok   ${out}`);
    } catch (error) {
      results.push(`FAIL ${out}: ${error.message.split('\n')[0]}`);
    }
  }
  await browser.close();
  console.log(results.join('\n'));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

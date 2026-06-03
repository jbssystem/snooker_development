import { test, expect, filterErrors } from '../support/test-base';

/**
 * Admin console tab navigation. The seeded fake user has the SYSTEM_ADMIN role
 * (see fixtures), so the console renders instead of the "forbidden" notice.
 */

test.describe('admin console', () => {
  test('switches between tabs', async ({ page, consoleErrors }) => {
    await page.goto('/en/admin/stats');
    await page.waitForLoadState('networkidle');

    // Console shell is present (not the "Administrators only" guard).
    await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible();

    await page.getByRole('link', { name: /^Users$/ }).click();
    await page.waitForURL('**/admin/users');
    await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible();

    await page.getByRole('link', { name: /^Announcements$/ }).click();
    await page.waitForURL('**/admin/announcements');
    await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible();

    await page.getByRole('link', { name: /^Exercises$/ }).click();
    await page.waitForURL('**/admin/exercises');
    await expect(page.getByRole('heading', { name: /administration/i })).toBeVisible();

    expect(filterErrors(consoleErrors)).toEqual([]);
  });
});

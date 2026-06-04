import { test, expect, filterErrors } from '../support/test-base';

/**
 * Delegated-access UI (smoke, mocked API):
 *  - the user menu shows the cabinet switcher when more than one cabinet is
 *    accessible (own + shared)
 *  - the profile Access tab (owner-only) lists members and the invite form
 */

test.describe('cabinet sharing', () => {
  test('user menu lists accessible cabinets', async ({ page, consoleErrors }, testInfo) => {
    test.skip(testInfo.project.name === 'e2e', 'asserts against mocked fixtures');
    await page.goto('/en/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Test Admin/ }).click();

    await expect(page.getByText('My cabinet')).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: /Judd Trump/ })).toBeVisible();

    expect(filterErrors(consoleErrors)).toEqual([]);
  });

  test('profile Access tab shows members and invite form', async ({ page, consoleErrors }, testInfo) => {
    test.skip(testInfo.project.name === 'e2e', 'asserts against mocked fixtures');
    await page.goto('/en/profile');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /access/i }).click();

    await expect(page.getByRole('heading', { name: /cabinet access/i })).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByText('Coach Carter')).toBeVisible();
    await expect(page.getByText('parent@snooker.test')).toBeVisible();

    expect(filterErrors(consoleErrors)).toEqual([]);
  });
});

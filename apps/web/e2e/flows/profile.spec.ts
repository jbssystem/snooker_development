import { test, expect, filterErrors } from '../support/test-base';

/**
 * Profile Settings tab — the change-password form:
 *  - mismatched confirmation is rejected client-side
 *  - a matching pair submits and surfaces the success state
 * (API is mocked in the smoke project, so the POST resolves without a backend.)
 */

test.describe('profile settings', () => {
  test('change password: mismatch then success', async ({ page, consoleErrors }, testInfo) => {
    // Smoke-only: the success path asserts against the mocked change-password
    // endpoint. Against the real backend (e2e) it would need the real current
    // password and would actually rotate the admin account's password.
    test.skip(testInfo.project.name === 'e2e', 'asserts against the mocked endpoint');

    await page.goto('/en/profile');
    await page.waitForLoadState('networkidle');

    // Open the Settings tab.
    await page.getByRole('tab', { name: /settings/i }).click();

    const heading = page.getByRole('heading', { name: /change password/i });
    await expect(heading).toBeVisible();

    const passwords = page.locator('input[type="password"]');
    await expect(passwords).toHaveCount(3);

    const submit = page.getByRole('button', { name: /change password/i });

    // Mismatch: confirmation differs → client-side guard, no success.
    await passwords.nth(0).fill('current-secret');
    await passwords.nth(1).fill('new-secret-123');
    await passwords.nth(2).fill('different-456');
    await submit.click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();

    // Matching pair → the mocked endpoint resolves and success shows.
    await passwords.nth(2).fill('new-secret-123');
    await submit.click();
    await expect(page.getByText(/password updated/i)).toBeVisible();

    expect(filterErrors(consoleErrors)).toEqual([]);
  });
});

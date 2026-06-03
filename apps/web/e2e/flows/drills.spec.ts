import { test, expect, filterErrors } from '../support/test-base';

/**
 * Key interactions on the Drill library page:
 *  - opening the "New drill" modal renders the template form
 *  - the visibility filter chips toggle their pressed state
 */

test.describe('drills page interactions', () => {
  test('opens the new-drill modal', async ({ page }) => {
    await page.goto('/en/drills');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /new drill/i }).click();

    await expect(page.getByTestId('drill-template-form')).toBeVisible();
  });

  test('visibility filter chips toggle', async ({ page, consoleErrors }) => {
    await page.goto('/en/drills');
    await page.waitForLoadState('networkidle');

    const group = page.getByRole('group').first();
    await expect(group).toBeVisible();

    const chips = group.getByRole('button');
    expect(await chips.count()).toBeGreaterThan(1);

    // First chip ("All") starts pressed; pick another and confirm it activates.
    const other = chips.nth(1);
    await other.click();
    await expect(other).toHaveAttribute('aria-pressed', 'true');

    expect(filterErrors(consoleErrors)).toEqual([]);
  });
});

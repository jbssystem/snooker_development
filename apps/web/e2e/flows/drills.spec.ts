import { test, expect, filterErrors } from '../support/test-base';

/**
 * Key interactions on the Drill library page:
 *  - opening the "New drill" modal renders the template form
 *  - a filter dropdown opens and selecting an option activates the trigger
 */

test.describe('drills page interactions', () => {
  test('opens the new-drill modal', async ({ page }) => {
    await page.goto('/en/drills');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /new drill/i }).click();

    await expect(page.getByTestId('drill-template-form')).toBeVisible();
  });

  test('filter dropdown selects a value', async ({ page, consoleErrors }) => {
    await page.goto('/en/drills');
    await page.waitForLoadState('networkidle');

    const group = page.getByRole('group').first();
    await expect(group).toBeVisible();

    // The filters render as dropdown triggers; open the first one.
    const trigger = group.getByRole('button').first();
    await trigger.click();

    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    // Pick a non-default option and confirm the trigger reflects the choice.
    const option = listbox.getByRole('option').nth(1);
    const optionLabel = ((await option.textContent()) ?? '').trim();
    await option.click();

    await expect(listbox).toBeHidden();
    await expect(trigger).toContainText(optionLabel);

    expect(filterErrors(consoleErrors)).toEqual([]);
  });
});

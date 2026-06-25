import { expect, test } from '@playwright/test';

test.describe('visual regression', () => {
    test('homepage', async ({ page }) => {
        await page.goto('/');
        // Tournament cards show live data that changes day to day, independent of any
        // visual regression in the page itself; mask them out so the test only catches
        // real layout/style changes in the static chrome around them.
        await expect(page).toHaveScreenshot({
            fullPage: true,
            animations: 'disabled',
            mask: [page.locator('.tournamentSection')],
        });
    });

    test('about page', async ({ page }) => {
        await page.goto('/about');
        await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });
});

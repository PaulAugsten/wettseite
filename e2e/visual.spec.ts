import { expect, test } from '@playwright/test';

test.describe('visual regression', () => {
    test('homepage', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });

    test('about page', async ({ page }) => {
        await page.goto('/about');
        await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/about', '/r6'];

for (const path of pages) {
    test(`no WCAG violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        // Freeze CSS animations (e.g. the "Live" badge pulse) so color-contrast checks
        // see the resting state instead of a transient mid-animation opacity dip.
        await page.addStyleTag({
            content:
                '*, *::before, *::after { animation: none !important; transition: none !important; }',
        });
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(results.violations).toEqual([]);
    });
}

import { test, expect } from '@playwright/test';
for (const width of [360, 768, 1280]) {
  test(`navigation, disclosure and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const name of [
      'Transactions',
      'Upload & review',
      'Owed payments',
      'Schedules',
      'Forecast & insights',
      'Ask AI',
      'Credit readiness',
      'Settings',
      'Dashboard',
    ]) {
      if (width < 1024)
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const link = page
        .getByRole('navigation')
        .getByRole('link', { name, exact: true });
      await link.click();
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      if (width < 1024)
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(
        page.getByRole('navigation').getByRole('link', { name, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        page.getByText(
          'Demo mode: simulated data. Do not enter real financial information.',
        ),
      ).toBeVisible();
      await expect(page.getByText('Not implemented yet')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width < 1024)
        await expect(
          page.getByRole('button', { name: 'Close menu', exact: true }),
        ).toHaveAttribute('aria-expanded', 'true');
      if (width < 1024)
        await page
          .getByRole('button', { name: 'Close menu', exact: true })
          .click();
    }
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    await page.goto('/#/schedules');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Plan the next payment' }),
    ).toBeVisible();
    await page.goto('/#/missing');
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });
}
test('skip link supports keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

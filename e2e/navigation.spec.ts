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
      if (
        !['Transactions', 'Dashboard', 'Settings', 'Schedules'].includes(name)
      )
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

test('opening balance and manual transaction workflow', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('Opening amount (MMK)').fill('100000');
  await page.getByRole('button', { name: 'Save opening balance' }).click();
  await expect(page.getByText('100,000 MMK')).toBeVisible();
  await page.getByRole('link', { name: 'View transactions' }).click();
  await page.getByLabel('Type').selectOption('income');
  await page.getByLabel('Amount (MMK)').fill('2500');
  await page.getByLabel('Category').selectOption('sales');
  await page.getByLabel('Description').fill('Market sale');
  await page.getByLabel('It happened after the opening balance time').check();
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByText('Market sale')).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Amount (MMK)')).toHaveValue('2500');
  await page.getByLabel('Amount (MMK)').fill('3000');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByText('3,000 MMK')).toBeVisible();
});

test('one-time schedule is assumed once and can be marked unpaid', async ({
  page,
}) => {
  await page.goto('/#/schedules');
  await page.getByLabel('Type').selectOption('expense');
  await page.getByLabel('Amount (MMK)').fill('45000');
  await page.getByLabel('Description').fill('Electricity bill');
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(page.getByText('Auto-recorded · Unconfirmed')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Auto-recorded · Unconfirmed')).toBeVisible();
  await page.getByRole('link', { name: 'Confirm or correct' }).click();
  await expect(
    page.getByRole('heading', { name: 'Correct existing record' }),
  ).toBeVisible();
  await page.getByLabel('Payment confirmation').selectOption('confirmed');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Schedules' })
    .click();
  await expect(page.getByText('Confirmed paid')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Mark unpaid' }).click();
  await expect(page.getByText('Marked unpaid')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Marked unpaid')).toBeVisible();
});

test('monthly schedule clamps month ends and catches up each eligible occurrence', async ({
  page,
}) => {
  await page.goto('/#/schedules');
  await page.getByLabel('Repeats').selectOption('monthly');
  await page.getByLabel('Amount (MMK)').fill('125000');
  await page.getByLabel('First eligible date').fill('2026-01-31');
  await page.getByLabel('Day of month (1–31)').fill('31');
  await page.getByLabel('Last eligible date (optional)').fill('2026-03-31');
  await page.getByLabel('Description').fill('Monthly rent');
  await page.getByRole('button', { name: 'Save schedule' }).click();

  await expect(page.getByText('2026-01-31 · 125,000 MMK')).toBeVisible();
  await expect(page.getByText('2026-02-28 · 125,000 MMK')).toBeVisible();
  await expect(page.getByText('2026-03-31 · 125,000 MMK')).toBeVisible();
  await expect(page.getByText('Auto-recorded · Unconfirmed')).toHaveCount(3);
  await page.reload();
  await expect(page.getByText('Auto-recorded · Unconfirmed')).toHaveCount(3);
});

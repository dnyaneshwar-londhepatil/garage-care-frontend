import { test, expect } from '@playwright/test';

test('dashboard searches, filters, expands jobs and keeps actions in preview', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(
    page.getByText('No live garage connection', { exact: false }),
  ).toBeVisible();
  const search = page.getByRole('searchbox', {
    name: 'Search sample service jobs',
  });
  for (const index of [0, 1]) {
    for (const button of [
      page.getByRole('button', { name: 'Call', exact: true }).nth(index),
      page.locator('.job .view').nth(index),
    ]) {
      await expect(button).toHaveCSS('background-color', 'rgb(229, 238, 255)');
      await button.hover();
      await expect(button).toHaveCSS('background-color', 'rgb(0, 84, 202)');
      await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
      await page.locator('h1').hover();
    }
  }
  const reminderButton = page
    .getByRole('button', { name: 'Send Reminder', exact: true })
    .first();
  const buttonBox = await reminderButton.boundingBox();
  const cardBox = await page.locator('.reminder').first().boundingBox();
  expect(buttonBox!.width).toBeLessThan(cardBox!.width - 48);
  await expect(page.locator('.floor-stat')).toHaveCount(2);
  await search.fill('HONDA');
  await expect(page.locator('.job')).toHaveCount(1);
  await page
    .getByRole('combobox', { name: 'Filter jobs by status' })
    .selectOption('Completed');
  await expect(
    page.getByRole('heading', { name: 'No matching service jobs' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.job')).toHaveCount(5);
  await page.getByRole('button', { name: 'View JOB-024' }).click();
  await expect(
    page.getByText('Periodic service · Oil change', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close JOB-024 details' }).click();
  await expect(page.locator('.job-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Send Reminder' }).first().click();
  await expect(page.getByRole('status')).toContainText(
    'No record was created, changed, or message sent',
  );
  await page
    .getByRole('button', { name: 'WhatsApp', exact: true })
    .first()
    .click();
  await expect(page.getByRole('status')).toContainText(
    'WhatsApp to Suresh Patil',
  );
});

test('dashboard fits desktop, tablet and mobile with keyboard navigation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Good morning, Rajesh!' }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('h1')
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain('Hanken Grotesk');
    expect(
      await page
        .locator('.metric-value')
        .first()
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain('JetBrains Mono');
    if (width < 800) {
      const toggle = page.getByRole('button', { name: 'Toggle navigation' });
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await page.screenshot({
      path: `dist/dashboard-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

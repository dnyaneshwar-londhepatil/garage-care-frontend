import { test, expect } from '@playwright/test';

test('sign-up validates input without submitting incomplete garage details', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.locator('#garageName')).toHaveClass(/ng-pristine/);
  await expect(
    page.getByRole('heading', { name: 'Create your account' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Create Account', exact: true })
    .click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByLabel('Full Name').fill('Test Owner');
  await page.getByLabel('Garage Name').fill('Apex Auto Garage');
  await page.getByLabel('Email Address').fill('owner@example.com');
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('9876543210');
  await page.getByLabel('Create Password', { exact: true }).fill('Workshop1!');
  await page.getByLabel('Confirm Password', { exact: true }).fill('Workshop1!');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.getByRole('checkbox', { name: 'I agree' }).check();
  await page
    .getByRole('button', { name: 'Create Account', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Please correct the highlighted fields.',
  );
});

test('sign-up fits desktop, tablet, and mobile widths', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/sign-up');
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `dist/signup-${width}.png`, fullPage: true });
  }
});

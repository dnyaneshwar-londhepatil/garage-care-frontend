import { test, expect } from '@playwright/test';
test('forgot password validates email and reports preview without delivery', async ({
  page,
}) => {
  await page.goto('/forgot-password');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(
    page.getByText('Enter a valid email address.', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Email address', { exact: true })
    .fill('owner@example.com');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByRole('status')).toContainText(
    'No reset email has been sent',
  );
  await page.getByRole('link', { name: 'Back to Sign In' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
test('forgot password fits desktop, tablet and mobile', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/forgot-password');
    await expect(
      page.getByRole('heading', { name: 'Forgot your password?' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel('Email address', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Send Reset Link' }),
    ).toBeFocused();
    await page.screenshot({ path: `dist/forgot-${width}.png`, fullPage: true });
  }
});

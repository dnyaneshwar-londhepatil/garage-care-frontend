import { test, expect } from '@playwright/test';
test('reset password validates, toggles and never reports a password change', async ({
  page,
}) => {
  await page.goto('/reset-password');
  await page
    .getByRole('button', { name: 'Reset Password', exact: true })
    .click();
  await expect(
    page.getByText('Use 12–128 characters, a number, and a special character.'),
  ).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('WorkshopTest1!');
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('Different1!');
  await page
    .getByRole('button', { name: 'Reset Password', exact: true })
    .click();
  await expect(
    page.getByText('Enter the same password in both fields.'),
  ).toBeVisible();
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('WorkshopTest1!');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.locator('#reset-password')).toHaveAttribute('type', 'text');
  await page
    .getByRole('button', { name: 'Show confirmation password', exact: true })
    .click();
  await expect(page.locator('#reset-confirmation')).toHaveAttribute(
    'type',
    'text',
  );
  await page
    .getByRole('button', { name: 'Reset Password', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Reset link is missing');
  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
test('reset password fits desktop, tablet and mobile', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reset-password');
    await expect(
      page.getByRole('heading', { name: 'Create a new password' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Reset Password', exact: true }),
    ).toBeEnabled();
    await page.getByLabel('New password', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Show password', exact: true }),
    ).toBeFocused();
    await page.screenshot({ path: `dist/reset-${width}.png`, fullPage: true });
  }
});

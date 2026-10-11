import { test, expect } from '@playwright/test';

test('sign-in validates fields, toggles password, and links to sign-up', async ({
  page,
}) => {
  await page.goto('/sign-in');
  await expect(page).toHaveTitle('Sign in | GarageCare');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(
    page.getByText('Enter your password.', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Email address', { exact: true })
    .fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('existing-password');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.locator('#signin-password')).toHaveAttribute(
    'type',
    'text',
  );
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'No session has been created',
  );
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Password recovery is not available',
  );
  await page.getByRole('link', { name: 'Create one' }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.getByRole('link', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('sign-in fits mobile, tablet, and desktop and supports keyboard input', async ({
  page,
}) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/sign-in');
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel('Email address', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
    await page.screenshot({ path: `dist/signin-${width}.png`, fullPage: true });
  }
});

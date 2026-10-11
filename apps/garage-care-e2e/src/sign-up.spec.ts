import { test, expect } from '@playwright/test';

test('sign-up registers through the local API and establishes a session', async ({
  page,
}) => {
  test.skip(
    process.env['RUN_LOCAL_BACKEND'] !== '1',
    'Requires the local replica-set backend; creates a test garage.',
  );
  await page.goto('/sign-up');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.locator('#fullName').fill('Local Test Owner');
  await page.locator('#garageName').fill('Integration Test Garage');
  const email = 'signup-test-' + Date.now() + '@example.invalid';
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('9876543210');
  const password = 'LocalTest!-' + crypto.randomUUID();
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.locator('input[formControlName="terms"]').check();
  const responsePromise = page.waitForResponse('**/api/v1/auth/register');
  await page
    .getByRole('button', { name: 'Create Account', exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(page).toHaveURL(/\/dashboard$/);
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).data.user.fullName).toBe('Local Test Owner');
  await expect(
    page.getByRole('heading', { name: 'Welcome, Local Test Owner!' }),
  ).toBeVisible();
  await expect(page.locator('.job')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Welcome, Local Test Owner!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome, Local Test Owner!' }),
  ).toBeVisible();
  // Registration succeeded in the real local database; no provider delivery is involved.
});

test('sign-up layout and backend failure stay accessible across sizes', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'test-csrf' } } }),
  );
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({ status: 409, json: { error: { code: 'CONFLICT' } } }),
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/sign-up');
    await page
      .getByRole('button', { name: 'Show password', exact: true })
      .click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('#fullName')).toBeEnabled();
    await page.locator('#fullName').fill('Local Test Owner');
    await page.locator('#garageName').fill('Test Garage');
    await page.locator('#email').fill('test@example.invalid');
    await page.locator('#phone').fill('9876543210');
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.locator('input[formControlName="terms"]').check();
    await page
      .getByRole('button', { name: 'Create Account', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('already exists');
    await expect(page).toHaveURL(/\/sign-up$/);
  }
});

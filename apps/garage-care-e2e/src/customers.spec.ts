import { test, expect } from '@playwright/test';

for (const width of [1440, 768, 390]) {
  test(
    'customers preview is interactive at ' +
      width +
      'px without backend writes',
    async ({ page }) => {
      let requests = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/')) requests++;
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/preview/customers');
      await expect(page.locator('tbody tr')).toHaveCount(5);
      await page
        .getByRole('button', { name: 'Add Customer', exact: true })
        .click();
      await expect(
        page.getByLabel('Customer name', { exact: true }),
      ).toBeFocused();
      await page
        .getByRole('button', { name: 'Save sample customer', exact: true })
        .click();
      await expect(page.getByText('Enter a customer name.')).toBeVisible();
      await page
        .getByLabel('Customer name', { exact: true })
        .fill('Sample Asha');
      await page
        .getByLabel('Mobile number', { exact: true })
        .fill('9876543210');
      await page
        .getByRole('button', { name: 'Save sample customer', exact: true })
        .click();
      await expect(page.getByRole('status')).toContainText('No server record');
      await page
        .getByRole('searchbox', { name: 'Search customers' })
        .fill('Sample Asha');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await page
        .getByRole('button', { name: 'Edit Sample Asha', exact: true })
        .click();
      await page
        .getByLabel('Customer name', { exact: true })
        .fill('Updated sample');
      await page
        .getByRole('button', { name: 'Save sample customer', exact: true })
        .click();
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(6);
      await expect(
        page.getByText('Updated sample', { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(requests).toBe(0);
    },
  );
}

test('customers uses backend search and save responses', async ({ page }) => {
  let records = [{ _id: 'c1', name: 'API Customer', phone: '+919876543210' }];
  let writes = 0;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const data = (value: unknown) => route.fulfill({ json: { data: value } });
    if (path === '/auth/me')
      return data({
        user: {
          id: 'owner',
          fullName: 'Owner',
          email: 'owner@example.invalid',
        },
        garage: { _id: 'garage', name: 'Test Garage' },
      });
    if (path === '/auth/csrf') return data({ csrfToken: 'customer-test-csrf' });
    if (path === '/customers' && route.request().method() === 'POST') {
      writes++;
      expect(route.request().postDataJSON()).toEqual({
        name: 'API Asha',
        phone: '+919123456789',
        address: '',
        notes: '',
      });
      const record = { ...route.request().postDataJSON(), _id: 'c2' };
      records.push(record);
      return data(record);
    }
    if (path === '/customers')
      return route.fulfill({
        json: {
          data: records.filter((row) =>
            row.name.includes(url.searchParams.get('q') || ''),
          ),
          page: { nextCursor: null, limit: 20 },
        },
      });
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected API request' } },
    });
  });
  await page.goto('/customers');
  await expect(page.getByText('API Customer', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
  await page.getByLabel('Customer name', { exact: true }).fill('API Asha');
  await page.getByLabel('Mobile number', { exact: true }).fill('9123456789');
  await page
    .getByRole('button', { name: 'Save customer', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText('Customer saved.');
  await expect(page.getByText('API Asha', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  await page
    .getByRole('searchbox', { name: 'Search customers' })
    .fill('API Asha');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('customers shows backend failures without substituting sample data', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      json: {
        data: {
          user: { id: 'owner', email: 'owner@example.invalid' },
          garage: { _id: 'g', name: 'Garage' },
        },
      },
    }),
  );
  await page.route('**/api/v1/customers*', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: 'Customers unavailable' } },
    }),
  );
  await page.goto('/customers');
  await expect(page.getByRole('alert')).toContainText('Customers unavailable');
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

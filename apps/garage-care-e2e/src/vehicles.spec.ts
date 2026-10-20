import { test, expect } from '@playwright/test';

for (const width of [1440, 768, 390]) {
  test(
    'vehicles preview supports customer selection and editing at ' +
      width +
      'px without API calls',
    async ({ page }) => {
      let requests = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/')) requests++;
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/preview/vehicles');
      await expect(page.locator('tbody tr')).toHaveCount(5);
      await page
        .getByRole('button', { name: 'Add Vehicle', exact: true })
        .click();
      await expect(
        page.getByLabel('Registration number', { exact: true }),
      ).toBeFocused();
      await page
        .getByRole('button', { name: 'Save sample vehicle', exact: true })
        .click();
      await expect(
        page.getByText('Select the customer who owns this vehicle.'),
      ).toBeVisible();
      await page.getByLabel('Find a customer', { exact: true }).fill('Ramesh');
      await page
        .getByRole('button', { name: 'Search customers', exact: true })
        .click();
      await page
        .getByLabel('Customer', { exact: true })
        .selectOption('sample-c0');
      await page
        .getByLabel('Registration number', { exact: true })
        .fill('mh 12 xy1234');
      await page.getByLabel('Make', { exact: true }).fill('Honda');
      await page.getByLabel('Model', { exact: true }).fill('City');
      await page
        .getByRole('button', { name: 'Save sample vehicle', exact: true })
        .click();
      await expect(page.locator('.notice[role="status"]')).toContainText(
        'No server record',
      );
      await page
        .getByRole('searchbox', { name: 'Search vehicles' })
        .fill('MH12XY1234');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await page
        .getByRole('button', { name: 'Edit MH12XY1234', exact: true })
        .click();
      await expect(
        page.getByText(
          'The customer linked to this vehicle cannot be changed.',
        ),
      ).toBeVisible();
      await expect(page.getByLabel('Customer', { exact: true })).toHaveCount(0);
      await page.getByLabel('Model', { exact: true }).fill('City ZX');
      await page
        .getByRole('button', { name: 'Save sample vehicle', exact: true })
        .click();
      await expect(
        page.getByText('Honda City ZX', { exact: true }),
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

test('vehicles sends normalized create and ownership-free edit payloads to the API', async ({
  page,
}) => {
  const customer = { _id: 'c1', name: 'API Customer', phone: '+919876543210' };
  let records: Record<string, unknown>[] = [];
  let creates = 0;
  let updates = 0;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    const data = (value: unknown) => route.fulfill({ json: { data: value } });
    if (path === '/auth/me')
      return data({
        user: { id: 'owner', email: 'owner@example.invalid' },
        garage: { _id: 'g', name: 'Test Garage' },
      });
    if (path === '/auth/csrf') return data({ csrfToken: 'vehicle-csrf-test' });
    if (path === '/customers')
      return route.fulfill({
        json: { data: [customer], page: { nextCursor: null } },
      });
    if (path === '/customers/c1') return data(customer);
    if (path === '/vehicles' && method === 'POST') {
      creates++;
      const input = route.request().postDataJSON();
      expect(input).toEqual({
        customerId: 'c1',
        registrationNumber: 'MH12XY1234',
        vehicleType: 'car',
        brand: 'Honda',
        model: 'City',
        currentKm: 0,
      });
      const vehicle = { ...input, _id: 'v1' };
      records = [vehicle];
      return data(vehicle);
    }
    if (path === '/vehicles/v1' && method === 'PATCH') {
      updates++;
      const input = route.request().postDataJSON();
      expect(input).not.toHaveProperty('customerId');
      expect(input.model).toBe('City ZX');
      records = [{ ...records[0], ...input }];
      return data(records[0]);
    }
    if (path === '/vehicles/v1') return data(records[0]);
    if (path === '/vehicles')
      return route.fulfill({
        json: { data: records, page: { nextCursor: null } },
      });
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected API request' } },
    });
  });
  await page.goto('/vehicles');
  await expect(
    page.getByRole('heading', { name: 'No vehicles yet' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add Vehicle', exact: true }).click();
  await page.getByLabel('Customer', { exact: true }).selectOption('c1');
  await page
    .getByLabel('Registration number', { exact: true })
    .fill('mh 12 xy1234');
  await page.getByLabel('Make', { exact: true }).fill('Honda');
  await page.getByLabel('Model', { exact: true }).fill('City');
  await page.getByText('More details (optional)', { exact: true }).click();
  await page.getByLabel('Odometer (km)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save vehicle', exact: true }).click();
  await expect(page.locator('.notice[role="status"]')).toHaveText(
    'Vehicle saved.',
  );
  await expect(page.locator('tbody')).toContainText('API Customer');
  await expect(page.locator('tbody')).toContainText('0 km');
  await page
    .getByRole('button', { name: 'Edit MH12XY1234', exact: true })
    .click();
  await page.getByLabel('Model', { exact: true }).fill('City ZX');
  await page.getByRole('button', { name: 'Save vehicle', exact: true }).click();
  await expect(page.getByText('Honda City ZX', { exact: true })).toBeVisible();
  expect(creates).toBe(1);
  expect(updates).toBe(1);
});

import { test, expect } from '@playwright/test';

test('intake submits linked records, INR paise, and retries start without duplicate creation', async ({
  page,
}) => {
  let creates = 0;
  let starts = 0;
  let payload: Record<string, unknown> = {};
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const paged = (data: unknown[]) =>
      route.fulfill({ json: { data, page: { limit: 100, nextCursor: null } } });
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          data: {
            user: { id: 'o', email: 'owner@example.invalid' },
            garage: { _id: 'g', name: 'Test Garage' },
          },
        },
      });
    if (path === '/auth/csrf')
      return route.fulfill({ json: { data: { csrfToken: 'test-csrf' } } });
    if (path === '/customers')
      return paged([
        { _id: 'c', name: 'Test Customer', phone: '+919000000000' },
      ]);
    if (path === '/vehicles')
      return paged([
        {
          _id: 'v',
          customerId: 'c',
          registrationNumber: 'MH12AB1234',
          brand: 'Honda',
          model: 'City',
          vehicleType: 'car',
          currentKm: 42000,
        },
      ]);
    if (path === '/parts')
      return paged([
        { _id: 'p', name: 'Engine Oil', category: 'Oil', mrpPaise: 245009 },
      ]);
    if (path === '/services' && route.request().method() === 'POST') {
      creates++;
      payload = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: {
          data: {
            ...payload,
            _id: 'j',
            serviceNumber: 'JOB-TEST',
            version: 0,
            status: 'draft',
          },
        },
      });
    }
    if (path === '/services/j') {
      starts++;
      return route.fulfill(
        starts === 1
          ? {
              status: 503,
              json: { error: { message: 'Start temporarily unavailable' } },
            }
          : {
              json: {
                data: {
                  ...payload,
                  _id: 'j',
                  serviceNumber: 'JOB-TEST',
                  version: 1,
                  status: 'in_progress',
                },
              },
            },
      );
    }
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected request' } },
    });
  });
  await page.goto('/service-jobs/new');
  await expect(
    page.getByLabel('Service date *', { exact: true }),
  ).toBeEnabled();
  await page.getByLabel('Customer record *', { exact: true }).selectOption('c');
  await page
    .getByLabel('Assigned vehicle *', { exact: true })
    .selectOption('v');
  await expect(page.getByLabel('Odometer reading (km)')).toHaveValue('42000');
  await page.getByLabel('Customer complaints').fill('Oil change');
  await page.getByLabel('Service date *', { exact: true }).fill('2026-10-14');
  await page.getByRole('button', { name: 'Add Part', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Catalog part *', exact: true })
    .selectOption('p');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page
    .getByRole('button', { name: 'Create Job Card & Start Work', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('The draft is saved');
  expect(payload).toMatchObject({
    customerId: 'c',
    vehicleId: 'v',
    serviceDate: '2026-10-13T18:30:00.000Z',
    odometerKm: 42000,
    items: [
      {
        kind: 'part',
        partId: 'p',
        mrpPaise: 245009,
        quantity: 1,
        taxCategory: 'non_gst',
      },
    ],
  });
  await page.getByRole('button', { name: 'Start work', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('saved and started');
  expect(creates).toBe(1);
  expect(starts).toBe(2);
  await expect(
    page.getByRole('button', { name: 'Start work', exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset['printed'] = 'true';
    };
  });
  await page
    .getByRole('button', { name: 'Print Job Card', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-printed', 'true');
  expect(creates).toBe(1);
});

test('creates customer and vehicle inline and preserves their relationship', async ({
  page,
}) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          data: {
            user: { id: 'o', email: 'owner@example.invalid' },
            garage: { _id: 'g', name: 'Garage' },
          },
        },
      });
    if (path === '/auth/csrf')
      return route.fulfill({ json: { data: { csrfToken: 'test' } } });
    if (path === '/customers' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({
        name: 'New Customer',
        phone: '+919876543210',
      });
      return route.fulfill({
        status: 201,
        json: { data: { _id: 'c', ...route.request().postDataJSON() } },
      });
    }
    if (path === '/vehicles' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({
        customerId: 'c',
        registrationNumber: 'MH12AB1234',
        brand: 'Honda',
        model: 'City',
      });
      return route.fulfill({
        status: 201,
        json: { data: { _id: 'v', ...route.request().postDataJSON() } },
      });
    }
    return route.fulfill({
      json: { data: [], page: { limit: 100, nextCursor: null } },
    });
  });
  await page.goto('/service-jobs/new');
  await expect(
    page.getByLabel('Service date *', { exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Full name *', { exact: true }).fill('New Customer');
  await page.getByLabel('Mobile number *', { exact: true }).fill('9876543210');
  await page
    .getByRole('button', { name: 'Save customer', exact: true })
    .click();
  await expect(
    page.getByLabel('Customer record *', { exact: true }),
  ).toHaveValue('c');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page
    .getByLabel('Registration number *', { exact: true })
    .fill('mh12 ab-1234');
  await page.getByLabel('Make *', { exact: true }).fill('Honda');
  await page.getByLabel('Model *', { exact: true }).fill('City');
  await page.getByRole('button', { name: 'Save vehicle', exact: true }).click();
  await expect(
    page.getByLabel('Assigned vehicle *', { exact: true }),
  ).toHaveValue('v');
});

for (const width of [1440, 768, 390]) {
  test(`intake preview is usable at ${width}px without API writes`, async ({
    page,
  }) => {
    let apiRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) apiRequests++;
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preview/service-jobs/new');
    await expect(
      page.getByLabel('Service date *', { exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel('Customer record *', { exact: true })
      .selectOption({ index: 1 });
    await page
      .getByLabel('Assigned vehicle *', { exact: true })
      .selectOption({ index: 1 });
    await page
      .getByRole('button', { name: 'Save as Draft', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Preview only');
    expect(apiRequests).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Add Labour', exact: true }).click();
    await page.getByLabel('Description *', { exact: true }).fill('Inspection');
    await page.getByLabel('Unit price (INR) *', { exact: true }).fill('500');
    await page.getByRole('button', { name: 'Add item', exact: true }).click();
    await expect(
      page.getByRole('row').filter({ hasText: 'Inspection' }),
    ).toContainText('₹500.00');
    await page
      .getByRole('button', { name: 'Remove Inspection', exact: true })
      .click();
    await expect(
      page.getByText('No billable items yet.', { exact: false }),
    ).toBeVisible();
  });
}

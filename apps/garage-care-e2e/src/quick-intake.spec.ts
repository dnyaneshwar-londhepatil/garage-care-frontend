import { test, expect, Page } from '@playwright/test';

async function fillIntake(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'New Service Job' });
  await dialog
    .getByLabel('Customer name', { exact: true })
    .fill('Test Customer');
  await dialog.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await dialog
    .getByLabel('Reg. plate number', { exact: true })
    .fill('mh12 ab-1234');
  await dialog.getByLabel('Vehicle make', { exact: true }).fill('Honda');
  await dialog.getByLabel('Vehicle model', { exact: true }).fill('City');
  await dialog
    .getByLabel('Primary complaint / scope', { exact: true })
    .fill('Brake inspection');
  await dialog.getByLabel('Service date', { exact: true }).fill('2026-10-14');
  return dialog;
}

test('creates records in order and retries start without duplicate records', async ({
  page,
}) => {
  const customer = { _id: 'c', name: 'Test Customer', phone: '+919876543210' };
  const vehicle = {
    _id: 'v',
    customerId: 'c',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car',
  };
  let customerWrites = 0,
    vehicleWrites = 0,
    jobWrites = 0,
    starts = 0;
  let job: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const method = route.request().method();
    const data = (value: unknown) => route.fulfill({ json: { data: value } });
    const list = (value: unknown[]) =>
      route.fulfill({
        json: { data: value, page: { limit: 100, nextCursor: null } },
      });
    if (path === '/auth/me')
      return data({
        user: { id: 'o', email: 'owner@example.invalid' },
        garage: { _id: 'g', name: 'Test Garage' },
      });
    if (path === '/auth/csrf') return data({ csrfToken: 'test' });
    if (path === '/dashboard/summary')
      return data({
        serviceCounts: {
          draft: job ? 1 : 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        },
        customers: 0,
        upcomingReminders: 0,
        recentInvoices: [],
        revenueSummary: { issuedInvoiceTotalPaise: 0, paidTotalPaise: null },
      });
    if (path === '/customers/c') return data(customer);
    if (path === '/vehicles/v') return data(vehicle);
    if (path === '/customers' && method === 'POST') {
      customerWrites++;
      expect(route.request().postDataJSON()).toEqual({
        name: customer.name,
        phone: customer.phone,
      });
      return data(customer);
    }
    if (path === '/vehicles' && method === 'POST') {
      vehicleWrites++;
      expect(route.request().postDataJSON()).toMatchObject({
        customerId: 'c',
        registrationNumber: 'MH12AB1234',
        brand: 'Honda',
        model: 'City',
        vehicleType: 'car',
      });
      return data(vehicle);
    }
    if (path === '/services' && method === 'POST') {
      jobWrites++;
      expect(route.request().postDataJSON()).toMatchObject({
        customerId: 'c',
        vehicleId: 'v',
        serviceDate: '2026-10-13T18:30:00.000Z',
        complaint: '[Brake Repair] Brake inspection',
        items: [],
      });
      job = {
        ...route.request().postDataJSON(),
        _id: 'j',
        serviceNumber: 'JOB-TEST',
        version: 0,
        status: 'draft',
      };
      return data(job);
    }
    if (path === '/services/j' && method === 'PATCH') {
      starts++;
      expect(route.request().postDataJSON()).toEqual({
        version: 0,
        status: 'in_progress',
      });
      if (starts === 1)
        return route.fulfill({
          status: 503,
          json: { error: { message: 'Start temporarily unavailable' } },
        });
      job = { ...job, status: 'in_progress', version: 1 };
      return data(job);
    }
    if (path === '/services') return list(job ? [job] : []);
    if (path === '/customers' || path === '/vehicles') return list([]);
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected API request' } },
    });
  });
  await page.goto('/service-jobs');
  await expect(page.getByText('Loading service jobs…')).not.toBeVisible();
  await page
    .getByRole('button', { name: 'New Service Job', exact: true })
    .click();
  const dialog = await fillIntake(page);
  await dialog
    .getByRole('button', { name: 'Brake Repair', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Create Service Job', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('draft is saved');
  await dialog
    .getByRole('button', { name: 'Retry Start Work', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText('Service job JOB-TEST saved and started.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('JOB-TEST', { exact: true })).toBeVisible();
  expect(customerWrites).toBe(1);
  expect(vehicleWrites).toBe(1);
  expect(jobWrites).toBe(1);
  expect(starts).toBe(2);
});

test('reuses existing customer/vehicle when saving a draft', async ({
  page,
}) => {
  const customer = { _id: 'c', name: 'Test Customer', phone: '+919876543210' };
  const vehicle = {
    _id: 'v',
    customerId: 'c',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car',
  };
  let writes = 0;
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
    if (path === '/customers/c')
      return route.fulfill({ json: { data: customer } });
    if (path === '/vehicles')
      return route.fulfill({
        json: { data: [vehicle], page: { nextCursor: null, limit: 100 } },
      });
    if (path === '/dashboard/summary')
      return route.fulfill({
        json: {
          data: {
            serviceCounts: {
              draft: 0,
              inProgress: 0,
              completed: 0,
              cancelled: 0,
            },
            customers: 1,
            upcomingReminders: 0,
            recentInvoices: [],
            revenueSummary: {
              issuedInvoiceTotalPaise: 0,
              paidTotalPaise: null,
            },
          },
        },
      });
    if (route.request().method() === 'POST') {
      expect(path).toBe('/services');
      writes++;
      return route.fulfill({
        json: {
          data: {
            ...route.request().postDataJSON(),
            _id: 'j',
            serviceNumber: 'JOB-DRAFT',
            version: 0,
            status: 'draft',
          },
        },
      });
    }
    return route.fulfill({
      json: { data: [], page: { nextCursor: null, limit: 100 } },
    });
  });
  await page.goto('/service-jobs');
  await page
    .getByRole('button', { name: 'New Service Job', exact: true })
    .click();
  const dialog = await fillIntake(page);
  await dialog
    .getByRole('button', { name: 'Save as Draft', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText('Service job JOB-DRAFT saved as draft.', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
});

for (const width of [1440, 768, 390]) {
  test(`minimal modal fits ${width}px and traps/restores focus without API writes`, async ({
    page,
  }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) requests++;
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preview/service-jobs');
    const opener = page.getByRole('button', {
      name: 'New Service Job',
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'New Service Job' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByLabel('Customer name', { exact: true }),
    ).toBeFocused();
    await dialog
      .getByRole('button', { name: 'Create Service Job', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('highlighted');
    await fillIntake(page);
    await dialog
      .getByRole('button', { name: 'Create Service Job', exact: true })
      .click();
    await expect(dialog.getByRole('status')).toContainText('Preview only');
    expect(requests).toBe(0);
    expect(
      await dialog.evaluate(
        (element) =>
          element.getBoundingClientRect().width <= innerWidth &&
          element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog
      .getByRole('button', { name: 'Create Service Job', exact: true })
      .focus();
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => !!document.activeElement?.closest('dialog')),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });
}

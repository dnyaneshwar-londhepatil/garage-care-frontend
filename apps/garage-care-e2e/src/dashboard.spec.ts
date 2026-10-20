import { test, expect, Page } from '@playwright/test';

async function mockGarage(page: Page, summaryStatus = 200) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const customer = {
      _id: 'customer',
      name: 'Real Customer',
      phone: '+919876543210',
      whatsappConsent: { status: 'opted_in', source: 'recorded-by-owner' },
    };
    const vehicle = {
      _id: 'vehicle',
      customerId: 'customer',
      brand: 'Honda',
      model: 'City',
      registrationNumber: 'MH12AB1234',
      vehicleType: 'car',
    };
    const job = {
      _id: 'job',
      customerId: 'customer',
      vehicleId: 'vehicle',
      complaint: 'Oil change',
      workPerformed: 'Changed oil',
      status: 'completed',
      version: 1,
    };
    const invoice = {
      _id: 'invoice',
      serviceId: 'job',
      invoiceNumber: 'GC/2026-27/00001',
      pdfStatus: 'ready',
      snapshot: { totals: { grandTotalPaise: 125050 } },
    };
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          data: {
            user: {
              id: 'owner',
              email: 'owner@example.com',
              fullName: 'Test Owner',
            },
            garage: { _id: 'garage', name: 'Test Garage' },
          },
        },
      });
    if (path === '/auth/csrf')
      return route.fulfill({ json: { data: { csrfToken: 'session-csrf' } } });
    if (path === '/auth/logout') {
      expect(route.request().headers()['x-csrf-token']).toBe('session-csrf');
      return route.fulfill({ status: 204 });
    }
    if (path === '/dashboard/summary')
      return route.fulfill({
        status: summaryStatus,
        json:
          summaryStatus === 200
            ? {
                data: {
                  serviceCounts: {
                    draft: 0,
                    inProgress: 0,
                    completed: 1,
                    cancelled: 0,
                  },
                  customers: 1,
                  upcomingReminders: 1,
                  recentInvoices: [invoice],
                  revenueSummary: {
                    issuedInvoiceTotalPaise: 125050,
                    paidTotalPaise: null,
                  },
                },
              }
            : { error: { message: 'Database unavailable' } },
      });
    if (path === '/customers/customer')
      return route.fulfill({ json: { data: customer } });
    if (path === '/vehicles/vehicle')
      return route.fulfill({ json: { data: vehicle } });
    if (path === '/services' || path === '/services/job/history')
      return route.fulfill({
        json: { data: [job], page: { limit: 20, nextCursor: null } },
      });
    if (path === '/services/job') return route.fulfill({ json: { data: job } });
    if (path === '/reminders')
      return route.fulfill({
        json: {
          data: [
            {
              _id: 'reminder',
              customerId: 'customer',
              vehicleId: 'vehicle',
              dueDate: '2027-01-01T00:00:00.000Z',
              scheduledAt: '2026-12-25T00:00:00.000Z',
              status: 'pending',
            },
          ],
          page: { limit: 20, nextCursor: null },
        },
      });
    if (path === '/reminders/reminder')
      return route.fulfill({
        json: {
          data: { status: 'pending', scheduledAt: '2026-12-25T00:00:00.000Z' },
        },
      });
    if (path === '/invoices/invoice')
      return route.fulfill({ json: { data: invoice } });
    if (path === '/invoices/invoice/pdf')
      return route.fulfill({
        contentType: 'application/pdf',
        body: '%PDF-1.4\nmock invoice',
      });
    if (path === '/invoices/invoice/whatsapp') {
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      expect(route.request().postDataJSON()).toEqual({
        recipientPhone: '+919876543210',
      });
      return route.fulfill({
        status: 202,
        json: { data: { _id: 'notification', status: 'queued' } },
      });
    }
    if (path === '/notifications/notification')
      return route.fulfill({
        json: { data: { _id: 'notification', status: 'queued' } },
      });
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Not found' } },
    });
  });
}

test('dashboard restores the owner session and uses real API response data and actions', async ({
  page,
}) => {
  await mockGarage(page);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', {
      name: /Good (morning|afternoon|evening), Test!/,
    }),
  ).toBeVisible();
  await expect(page.locator('.job')).toHaveCount(1);
  await expect(page.locator('.metrics')).toContainText('₹1,250.50');
  const search = page.getByRole('searchbox', {
    name: 'Search loaded service jobs',
  });
  await search.fill('unmatched');
  await expect(
    page.getByRole('heading', { name: 'No matching service jobs' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'View job', exact: true }).click();
  await page.getByRole('button', { name: 'Load service history' }).click();
  await expect(page.getByRole('status')).toContainText('Changed oil');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download invoice PDF' }).click();
  expect((await download).suggestedFilename()).toBe('GC-2026-27-00001.pdf');
  await page.getByRole('button', { name: 'WhatsApp', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('queued');
  await page.locator('.reminder-actions button').click();
  await expect(page.getByRole('status')).toContainText(
    'Reminder status: pending',
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('dashboard keeps its responsive layout at desktop, tablet and mobile sizes', async ({
  page,
}) => {
  await mockGarage(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await expect(page.locator('.job')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 768) {
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }),
      ).toBeHidden();
    }
    await page.screenshot({
      path: `dist/dashboard-live-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test('unavailable data shows an error and no sample jobs', async ({ page }) => {
  await mockGarage(page, 503);
  await page.goto('/dashboard');
  await expect(page.getByRole('status')).toContainText('Database unavailable');
  await expect(page.locator('.job')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh', exact: true }),
  ).toBeEnabled();
});

test('unauthenticated dashboard access redirects to sign-in', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'UNAUTHENTICATED' } },
    }),
  );
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('preview navigation shares service records and uses consistent action sizes', async ({
  page,
}) => {
  let apiRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) apiRequests++;
  });
  await page.goto('/preview/dashboard');
  await expect(page.locator('.job')).toHaveCount(5);
  await expect(page.locator('.metrics').first()).toContainText('2');
  await expect(
    page.getByRole('heading', { name: 'Ramesh Kumar' }),
  ).toBeVisible();
  const spacing = await page.evaluate(() => {
    const title = document.querySelector('.welcome').getBoundingClientRect();
    const header = document.querySelector('.topbar').getBoundingClientRect();
    const metrics = document.querySelector('.metrics').getBoundingClientRect();
    const operations = document
      .querySelector('.operations')
      .getBoundingClientRect();
    return {
      top: title.top - header.bottom,
      section: operations.top - metrics.bottom,
    };
  });
  expect(spacing.top).toBeGreaterThanOrEqual(24);
  expect(spacing.section).toBe(32);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Service Jobs', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/preview/service-jobs$'));
  await expect(page.locator('tbody > tr')).toHaveCount(5);
  const heights = await page
    .locator('button[gcButton]:visible')
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        Math.round(button.getBoundingClientRect().height),
      ),
    );
  expect(heights.every((height) => height === 40)).toBe(true);
  await page
    .getByRole('button', { name: 'New Service Job', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByLabel('Customer name', { exact: true }),
  ).toBeFocused();
  const modalHeights = await page
    .getByRole('dialog')
    .locator('button[gcButton]')
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        Math.round(button.getBoundingClientRect().height),
      ),
    );
  expect(modalHeights.every((height) => height === 40)).toBe(true);
  await page.keyboard.press('Escape');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Dashboard', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/preview/dashboard$'));
  await expect(page.locator('.job')).toHaveCount(5);
  expect(apiRequests).toBe(0);
  for (const route of [
    'sign-in',
    'sign-up',
    'forgot-password',
    'reset-password',
  ]) {
    await page.goto('/' + route);
    const submit = page.locator('.submit-button');
    if (await submit.count())
      expect(
        await submit.evaluate((button) =>
          Math.round(button.getBoundingClientRect().height),
        ),
      ).toBe(40);
  }
});

import { test, expect, Page } from '@playwright/test';

async function mockServices(page: Page, failure = false) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          data: {
            user: {
              id: 'owner',
              email: 'owner@example.invalid',
              fullName: 'Owner',
            },
            garage: { _id: 'garage', name: 'Test Garage' },
          },
        },
      });
    if (path === '/dashboard/summary')
      return route.fulfill({
        json: {
          data: {
            serviceCounts: {
              draft: 1,
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
    if (path === '/services')
      return route.fulfill(
        failure
          ? { status: 503, json: { error: { message: 'Service unavailable' } } }
          : {
              json: {
                data: [
                  {
                    _id: 'job-1',
                    serviceNumber: 'JOB-TEST',
                    customerId: 'customer-1',
                    vehicleId: 'vehicle-1',
                    serviceDate: '2026-10-12T04:00:00.000Z',
                    status: 'draft',
                    version: 0,
                    complaint: 'Oil change',
                  },
                ],
                page: { limit: 100, nextCursor: null },
              },
            },
      );
    if (path === '/customers/customer-1')
      return route.fulfill({
        json: {
          data: {
            _id: 'customer-1',
            name: 'API Customer',
            phone: '+919000000000',
          },
        },
      });
    if (path === '/vehicles/vehicle-1')
      return route.fulfill({
        json: {
          data: {
            _id: 'vehicle-1',
            customerId: 'customer-1',
            brand: 'Honda',
            model: 'City',
            registrationNumber: 'MH12AB1234',
            vehicleType: 'car',
          },
        },
      });
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected API request' } },
    });
  });
}

test('preview supports combined filters, selection, summary, settings and CSV export', async ({
  page,
}) => {
  let apiRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) apiRequests++;
  });
  await page.goto('/preview/service-jobs');
  await expect(
    page.getByRole('heading', { name: 'Service Jobs', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search service jobs', exact: true })
    .fill('MH 02 EE 4920');
  await expect(page.locator('tbody > tr')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'View job JC-1048', exact: true })
    .click();
  await expect(page.getByText('Job summary · JC-1048')).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Select job JC-1048', exact: true })
    .check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    'sample-service-jobs.csv',
  );
  await page
    .getByRole('searchbox', { name: 'Search service jobs', exact: true })
    .fill('');
  await page
    .getByRole('combobox', { name: 'Vehicle type', exact: true })
    .selectOption('scooter');
  await expect(page.locator('tbody > tr')).toHaveCount(1);
  await expect(page.getByText('Suresh Patil', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Table options', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Compact table rows', exact: true })
    .check();
  await expect(page.locator('.register')).toHaveClass(/compact/);
  expect(apiRequests).toBe(0);
});

test('authenticated route loads API records and shared navigation marks current page', async ({
  page,
}) => {
  await mockServices(page);
  await page.goto('/service-jobs');
  await expect(page.getByText('API Customer', { exact: true })).toBeVisible();
  await expect(page.getByText('JOB-TEST', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Service Jobs', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Design preview', { exact: true })).toHaveCount(
    0,
  );
});

test('API failures show retry without sample data', async ({ page }) => {
  await mockServices(page, true);
  await page.goto('/service-jobs');
  await expect(page.getByRole('alert')).toContainText('Service unavailable');
  await expect(
    page.getByRole('button', { name: 'Retry', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Ramesh Kumar', { exact: true })).toHaveCount(0);
});

for (const width of [1440, 768, 390]) {
  test(`preview fits ${width}px and supports accessible navigation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/preview/service-jobs');
    await expect(
      page.getByRole('heading', { name: 'Service Jobs', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width <= 800) {
      await page
        .getByRole('button', { name: 'Toggle navigation', exact: true })
        .click();
      await expect(
        page.getByRole('navigation', { name: 'Main navigation', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('navigation', { name: 'Main navigation', exact: true }),
      ).toBeHidden();
    }
  });
}

import { test, expect } from '@playwright/test';

test('workspace pages preload and switch without full reloads or repeated session checks', async ({
  page,
}) => {
  let sessionChecks = 0;
  let expired = false;
  let slowServices = false;
  let releaseServices: () => void = () => undefined;
  const servicesGate = new Promise<void>((resolve) => {
    releaseServices = resolve;
  });
  const garage = {
    _id: 'g1',
    name: 'Navigation Garage',
    phone: '+919876543210',
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      sessionChecks++;
      return expired
        ? route.fulfill({
            status: 401,
            json: { error: { message: 'Session expired' } },
          })
        : route.fulfill({
            json: {
              data: {
                user: {
                  id: 'owner',
                  email: 'owner@example.invalid',
                  fullName: 'Owner',
                },
                garage,
              },
            },
          });
    }
    if (path === '/customers' && expired)
      return route.fulfill({
        status: 401,
        json: { error: { message: 'Session expired' } },
      });
    if (path === '/services' && slowServices) await servicesGate;
    if (path === '/garage') return route.fulfill({ json: { data: garage } });
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
            customers: 0,
            upcomingReminders: 0,
            recentInvoices: [],
            revenueSummary: {
              issuedInvoiceTotalPaise: 0,
              paidTotalPaise: null,
            },
          },
        },
      });
    return route.fulfill({
      json: { data: [], page: { nextCursor: null, limit: 20 } },
    });
  });
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: /Good.*Owner!/ }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
  slowServices = true;
  const origin = await page.evaluate(() => performance.timeOrigin);
  const lateCode: string[] = [];
  await page.route('**/*.js', (route) => {
    lateCode.push(route.request().url());
    return route.abort();
  });
  for (const name of [
    'Service Jobs',
    'Invoices',
    'Parts & Services',
    'Reminders',
    'Settings',
    'Vehicles',
    'Dashboard',
  ]) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(page.locator('.breadcrumb strong')).toHaveText(name, {
      timeout: 1500,
    });
    if (name === 'Service Jobs') {
      await expect(
        page.getByText('Loading service jobs…', { exact: true }),
      ).toBeVisible();
      releaseServices();
      slowServices = false;
    }
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  }
  expect(sessionChecks).toBe(1);
  expect(lateCode).toEqual([]);
  expired = true;
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Customers', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/sign-in$'));
  expect(sessionChecks).toBe(1);
  // Reenter through browser history to exercise the guard in the same SPA instance.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp('/sign-in$'));
  expect(sessionChecks).toBe(2);
});

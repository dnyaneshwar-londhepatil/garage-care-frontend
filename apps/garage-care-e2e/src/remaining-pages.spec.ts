import { test, expect } from '@playwright/test';

for (const width of [1440, 768, 390]) {
  test(
    'remaining preview pages work at ' + width + 'px without backend calls',
    async ({ page }) => {
      let requests = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/')) requests++;
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/preview/parts');
      await page.getByRole('button', { name: 'Add Part', exact: true }).click();
      await page.getByLabel('Part name', { exact: true }).fill('Sample filter');
      await page.getByLabel('Category', { exact: true }).fill('Filters');
      await page.getByLabel('MRP (INR)', { exact: true }).fill('0.29');
      await page
        .getByRole('button', { name: 'Save sample part', exact: true })
        .click();
      await expect(
        page.getByText('Sample filter', { exact: true }),
      ).toBeVisible();
      await expect(page.locator('tbody')).toContainText('₹0.29');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.goto('/preview/invoices');
      await page.getByRole('button', { name: /^View SAMPLE/ }).click();
      await expect(
        page.getByRole('region', { name: 'Invoice details' }),
      ).toContainText('Suresh Patil');
      await page
        .getByRole('button', { name: 'Close details', exact: true })
        .click();
      await page.getByRole('button', { name: 'WhatsApp', exact: true }).click();
      await expect(page.locator('.notice[role="status"]')).toContainText(
        'No message',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.goto('/preview/reminders');
      await page
        .getByRole('button', { name: 'Schedule Reminder', exact: true })
        .click();
      await page
        .getByLabel('Vehicle', { exact: true })
        .selectOption('sample-v0');
      await page
        .getByLabel('Service due date', { exact: true })
        .fill('2026-12-10');
      await page
        .getByRole('button', { name: 'Schedule sample reminder', exact: true })
        .click();
      await expect(page.locator('.notice[role="status"]')).toContainText(
        'No message',
      );
      await page
        .getByRole('button', { name: 'Cancel reminder', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Confirm cancellation', exact: true })
        .click();
      await expect(page.locator('.notice[role="status"]')).toContainText(
        'cancelled',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.goto('/preview/settings');
      await page
        .getByLabel('Garage name', { exact: true })
        .fill('Updated sample garage');
      await page
        .getByRole('button', { name: 'Save sample settings', exact: true })
        .click();
      await expect(page.locator('.notice[role="status"]')).toContainText(
        'Sample settings saved',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(requests).toBe(0);
    },
  );
}

test('remaining pages use backend payloads and require confirmation for invoice delivery', async ({
  page,
}) => {
  const owner = {
    _id: 'c1',
    name: 'Asha',
    phone: '+919876543210',
    whatsappConsent: { status: 'opted_in', source: 'Recorded consent' },
  };
  const vehicle = {
    _id: 'v1',
    customerId: 'c1',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car',
  };
  let garage = { _id: 'g1', name: 'Garage', phone: '+919876543210' };
  let parts: Record<string, unknown>[] = [];
  let reminders: Record<string, unknown>[] = [];
  let messages = 0;
  let reminderWrites = 0;
  let profileWrites = 0;
  const invoice = {
    _id: 'i1',
    serviceId: 's1',
    invoiceNumber: 'GC/2026-27/00001',
    status: 'finalized',
    pdfStatus: 'ready',
    snapshot: {
      customer: { name: 'Asha' },
      vehicle: { registrationNumber: 'MH12AB1234' },
      totals: { grandTotalPaise: 29900 },
    },
  };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const method = route.request().method();
    const input = () => route.request().postDataJSON();
    const data = (value: unknown) => route.fulfill({ json: { data: value } });
    const list = (rows: unknown[]) =>
      route.fulfill({
        json: { data: rows, page: { nextCursor: null, limit: 20 } },
      });
    if (path === '/auth/me')
      return data({
        user: { id: 'u1', email: 'owner@example.invalid', fullName: 'Owner' },
        garage,
      });
    if (path === '/auth/csrf')
      return data({ csrfToken: 'remaining-pages-csrf' });
    if (path === '/parts' && method === 'POST') {
      expect(input()).toEqual({
        name: 'Oil',
        category: 'Lubricants',
        mrpPaise: 29,
      });
      parts = [{ _id: 'p1', ...input() }];
      return data(parts[0]);
    }
    if (path === '/parts') return list(parts);
    if (path === '/invoices') return list([invoice]);
    if (path === '/invoices/i1') return data(invoice);
    if (path === '/services/s1') return data({ _id: 's1', customerId: 'c1' });
    if (path === '/customers/c1') return data(owner);
    if (path === '/invoices/i1/pdf')
      return route.fulfill({
        contentType: 'application/pdf',
        body: '%PDF-1.4 sample',
      });
    if (path === '/invoices/i1/whatsapp') {
      messages++;
      expect(input()).toEqual({ recipientPhone: owner.phone });
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      return data({ _id: 'n1', status: 'queued' });
    }
    if (path === '/notifications/n1')
      return data({ _id: 'n1', status: 'delivered' });
    if (path === '/vehicles') return list([vehicle]);
    if (path === '/vehicles/v1') return data(vehicle);
    if (path === '/reminders' && method === 'POST') {
      reminderWrites++;
      expect(input()).toEqual({
        customerId: 'c1',
        vehicleId: 'v1',
        dueDate: '2026-12-09T18:30:00.000Z',
      });
      const record = {
        ...input(),
        _id: 'r1',
        status: 'pending',
        scheduledAt: '2026-12-02T18:30:00.000Z',
      };
      reminders = [record];
      return data(record);
    }
    if (path === '/reminders/r1' && method === 'PATCH') {
      expect(input()).toEqual({ status: 'cancelled' });
      reminders = reminders.map((row) => ({ ...row, status: 'cancelled' }));
      return data(reminders[0]);
    }
    if (path === '/reminders') return list(reminders);
    if (path === '/garage' && method === 'PATCH') {
      profileWrites++;
      expect(input()).toEqual({
        name: 'Updated Garage',
        phone: '+919876543210',
      });
      garage = { ...garage, ...input() };
      return data(garage);
    }
    if (path === '/garage') return data(garage);
    return route.fulfill({
      status: 404,
      json: { error: { message: 'Unexpected API request: ' + path } },
    });
  });
  await page.goto('/parts');
  await page.getByRole('button', { name: 'Add Part', exact: true }).click();
  await page.getByLabel('Part name', { exact: true }).fill('Oil');
  await page.getByLabel('Category', { exact: true }).fill('Lubricants');
  await page.getByLabel('MRP (INR)', { exact: true }).fill('0.29');
  await page.getByRole('button', { name: 'Save part', exact: true }).click();
  await expect(page.locator('.notice[role="status"]')).toHaveText(
    'Part saved.',
  );
  await page.goto('/invoices');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('GC-2026-27-00001.pdf');
  await page.getByRole('button', { name: 'WhatsApp', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Confirm invoice delivery' }),
  ).toBeVisible();
  expect(messages).toBe(0);
  await page.getByRole('button', { name: 'Confirm send', exact: true }).click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'does not confirm delivery',
  );
  expect(messages).toBe(1);
  await page
    .getByRole('button', { name: 'Check delivery', exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'delivered',
  );
  await page.goto('/reminders');
  await page
    .getByRole('button', { name: 'Schedule Reminder', exact: true })
    .click();
  await page.getByLabel('Vehicle', { exact: true }).selectOption('v1');
  await page.getByLabel('Service due date', { exact: true }).fill('2026-12-10');
  await page
    .getByRole('button', { name: 'Schedule reminder', exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'does not confirm delivery',
  );
  expect(reminderWrites).toBe(1);
  await page
    .getByRole('button', { name: 'Cancel reminder', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm cancellation', exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toContainText(
    'cancelled',
  );
  await page.goto('/settings');
  await page.getByLabel('Garage name', { exact: true }).fill('Updated Garage');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.locator('.notice[role="status"]')).toHaveText(
    'Garage settings saved.',
  );
  await expect(page.locator('.sidebar .garage')).toContainText(
    'Updated Garage',
  );
  expect(profileWrites).toBe(1);
});

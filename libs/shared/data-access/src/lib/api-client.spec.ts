import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApiClient, API_BASE_URL } from './api-client';
import { AuthApi } from './auth-api';
import { CustomersApi } from './customers-api';
import { VehiclesApi } from './vehicles-api';
import { PartsApi } from './parts-api';
import { ServicesApi } from './services-api';
import { GarageApi } from './garage-api';
import { InvoicesApi } from './invoices-api';
import { RemindersApi } from './reminders-api';
import { NotificationsApi } from './notifications-api';
import { DashboardApi } from './dashboard-api';

describe('Shared API integration', () => {
  let http: HttpTestingController;
  const base = 'http://localhost:3000/api/v1';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: base },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const cases = [
    ['GET', '/garage', () => TestBed.inject(GarageApi).get()],
    [
      'PATCH',
      '/garage',
      () => TestBed.inject(GarageApi).update({ name: 'Garage' }),
    ],
    [
      'GET',
      '/customers',
      () =>
        TestBed.inject(CustomersApi).list({
          limit: 20,
          cursor: 'abc',
          q: 'A+B',
        }),
    ],
    ['GET', '/customers/id', () => TestBed.inject(CustomersApi).get('id')],
    [
      'POST',
      '/customers',
      () =>
        TestBed.inject(CustomersApi).create({
          name: 'Owner',
          phone: '+919876543210',
        }),
    ],
    [
      'PATCH',
      '/customers/id',
      () => TestBed.inject(CustomersApi).update('id', { notes: 'Notes' }),
    ],
    ['GET', '/vehicles', () => TestBed.inject(VehiclesApi).list()],
    ['GET', '/vehicles/id', () => TestBed.inject(VehiclesApi).get('id')],
    [
      'POST',
      '/vehicles',
      () =>
        TestBed.inject(VehiclesApi).create({
          customerId: 'customer',
          brand: 'Honda',
          model: 'City',
          vehicleType: 'car',
          registrationNumber: 'MH12AB1234',
        }),
    ],
    [
      'PATCH',
      '/vehicles/id',
      () => TestBed.inject(VehiclesApi).update('id', { currentKm: 100 }),
    ],
    ['GET', '/parts', () => TestBed.inject(PartsApi).list()],
    ['GET', '/parts/id', () => TestBed.inject(PartsApi).get('id')],
    [
      'POST',
      '/parts',
      () =>
        TestBed.inject(PartsApi).create({
          name: 'Oil',
          category: 'Oil',
          mrpPaise: 10000,
        }),
    ],
    [
      'PATCH',
      '/parts/id',
      () => TestBed.inject(PartsApi).update('id', { mrpPaise: 20000 }),
    ],
    ['GET', '/services', () => TestBed.inject(ServicesApi).list()],
    ['GET', '/services/id', () => TestBed.inject(ServicesApi).get('id')],
    [
      'POST',
      '/services',
      () =>
        TestBed.inject(ServicesApi).create({
          customerId: 'customer',
          vehicleId: 'vehicle',
          serviceDate: '2026-10-12T00:00:00.000Z',
        }),
    ],
    [
      'PATCH',
      '/services/id',
      () =>
        TestBed.inject(ServicesApi).update('id', {
          version: 3,
          status: 'in_progress',
        }),
    ],
    [
      'GET',
      '/services/id/history',
      () => TestBed.inject(ServicesApi).history('id'),
    ],
    [
      'POST',
      '/services/id/complete',
      () => TestBed.inject(ServicesApi).complete('id', 'stable-key-123'),
    ],
    ['GET', '/invoices', () => TestBed.inject(InvoicesApi).list()],
    ['GET', '/invoices/id', () => TestBed.inject(InvoicesApi).get('id')],
    [
      'POST',
      '/invoices/id/whatsapp',
      () =>
        TestBed.inject(InvoicesApi).sendWhatsApp(
          'id',
          '+919876543210',
          'stable-key-123',
        ),
    ],
    ['GET', '/reminders', () => TestBed.inject(RemindersApi).list()],
    ['GET', '/reminders/id', () => TestBed.inject(RemindersApi).get('id')],
    [
      'POST',
      '/reminders',
      () =>
        TestBed.inject(RemindersApi).create({
          customerId: 'customer',
          vehicleId: 'vehicle',
          dueDate: '2026-11-12T00:00:00.000Z',
        }),
    ],
    [
      'PATCH',
      '/reminders/id',
      () => TestBed.inject(RemindersApi).update('id', { status: 'cancelled' }),
    ],
    [
      'GET',
      '/notifications/id',
      () => TestBed.inject(NotificationsApi).get('id'),
    ],
    ['GET', '/dashboard/summary', () => TestBed.inject(DashboardApi).summary()],
  ] as const;
  for (const [method, path, call] of cases)
    it(`${method} ${path} uses the configured host, credentials and write protection`, async () => {
      const result = call();
      if (method !== 'GET') {
        await vi.waitFor(() =>
          http
            .expectOne(base + '/auth/csrf')
            .flush({ data: { csrfToken: 'csrf' } }),
        );
      }
      let request: ReturnType<HttpTestingController['expectOne']>;
      await vi.waitFor(() => {
        request = http.expectOne((req) => req.url === base + path);
      });
      expect(request.request.method).toBe(method);
      expect(request.request.withCredentials).toBe(true);
      if (method !== 'GET')
        expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf');
      if (path.endsWith('/complete') || path.endsWith('/whatsapp'))
        expect(request.request.headers.get('Idempotency-Key')).toBe(
          'stable-key-123',
        );
      if (path === '/services/id' && method === 'PATCH')
        expect(request.request.body).toEqual({
          version: 3,
          status: 'in_progress',
        });
      if (path === '/customers' && method === 'GET') {
        expect(request.request.params.get('q')).toBe('A+B');
        expect(request.request.params.get('cursor')).toBe('abc');
      }
      request.flush({ data: [], page: { limit: 20, nextCursor: 'next' } });
      await result;
    });
  it('rotates session CSRF without racing parallel writes and clears user state on logout', async () => {
    const auth = TestBed.inject(AuthApi);
    const login = auth.login('owner@example.com', 'WorkshopTest1!');
    await vi.waitFor(() =>
      http
        .expectOne(base + '/auth/csrf')
        .flush({ data: { csrfToken: 'anonymous' } }),
    );
    await vi.waitFor(() =>
      http.expectOne(base + '/auth/login').flush({
        data: {
          user: { id: 'owner', email: 'owner@example.com' },
          garage: { _id: 'garage', name: 'Garage' },
          csrfToken: 'session',
        },
      }),
    );
    await login;
    expect(auth.user()?.id).toBe('owner');
    const refresh = auth.refresh();
    const logout = auth.logout();
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/auth/refresh');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('session');
      req.flush({ data: { csrfToken: 'rotated' } });
    });
    await refresh;
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/auth/logout');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('rotated');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
    await logout;
    expect(auth.user()).toBeNull();
    expect(auth.garage()).toBeNull();
  });
  it('refreshes rejected CSRF once while preserving financial idempotency', async () => {
    TestBed.inject(ApiClient).setCsrf('stale');
    const result = TestBed.inject(ServicesApi).complete('id', 'same-key-123');
    await vi.waitFor(() =>
      http
        .expectOne(base + '/services/id/complete')
        .flush(
          { error: { code: 'CSRF_INVALID' } },
          { status: 403, statusText: 'Forbidden' },
        ),
    );
    await vi.waitFor(() =>
      http
        .expectOne(base + '/auth/csrf')
        .flush({ data: { csrfToken: 'fresh' } }),
    );
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/services/id/complete');
      expect(req.request.headers.get('Idempotency-Key')).toBe('same-key-123');
      expect(req.request.headers.get('X-CSRF-Token')).toBe('fresh');
      req.flush({ data: { _id: 'invoice' } });
    });
    expect((await result)._id).toBe('invoice');
  });
  it('downloads authorized PDFs as blobs', async () => {
    const result = TestBed.inject(InvoicesApi).pdf('invoice');
    const req = http.expectOne(base + '/invoices/invoice/pdf');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.withCredentials).toBe(true);
    req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    expect((await result).type).toBe('application/pdf');
  });
  it('registers the minimal approved form and restores owner/garage on reload', async () => {
    const auth = TestBed.inject(AuthApi);
    const input = {
      owner: {
        fullName: 'Test Owner',
        email: 'owner@example.com',
        password: 'WorkshopTest1!',
      },
      garage: { name: 'Test Garage', phone: '+919876543210' },
    };
    const registration = auth.register(input);
    await vi.waitFor(() =>
      http
        .expectOne(base + '/auth/csrf')
        .flush({ data: { csrfToken: 'anonymous' } }),
    );
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/auth/register');
      expect(req.request.body).toEqual(input);
      req.flush({
        data: {
          user: {
            id: 'owner',
            email: input.owner.email,
            fullName: input.owner.fullName,
          },
          garage: { _id: 'garage', name: input.garage.name },
          csrfToken: 'session',
        },
      });
    });
    await registration;
    expect(auth.user()?.fullName).toBe('Test Owner');
    const me = auth.me();
    http
      .expectOne(base + '/auth/me')
      .flush({
        data: {
          user: { id: 'owner', email: input.owner.email },
          garage: { _id: 'garage', name: 'Restored Garage' },
        },
      });
    await me;
    expect(auth.garage()?.name).toBe('Restored Garage');
  });
  it('uses anonymous CSRF for recovery and handles the 204 reset response', async () => {
    const auth = TestBed.inject(AuthApi);
    const forgot = auth.forgotPassword('owner@example.com');
    await vi.waitFor(() =>
      http
        .expectOne(base + '/auth/csrf')
        .flush({ data: { csrfToken: 'anonymous' } }),
    );
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/auth/forgot-password');
      expect(req.request.body).toEqual({ email: 'owner@example.com' });
      req.flush(
        {
          data: {
            message: 'If the account exists, a reset email will be sent.',
          },
        },
        { status: 202, statusText: 'Accepted' },
      );
    });
    expect((await forgot).message).toContain('If the account exists');
    const reset = auth.resetPassword(
      'valid-reset-token-long-enough',
      'WorkshopTest1!',
    );
    await vi.waitFor(() => {
      const req = http.expectOne(base + '/auth/reset-password');
      expect(req.request.body).toEqual({
        token: 'valid-reset-token-long-enough',
        password: 'WorkshopTest1!',
      });
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
    await reset;
    expect(auth.user()).toBeNull();
  });
  it('does not retry a failed mutation and allows the next queued write', async () => {
    const api = TestBed.inject(ApiClient);
    api.setCsrf('session');
    const failed = api.write('POST', '/customers', { name: 'Test' });
    const rejection = expect(failed).rejects.toMatchObject({ status: 503 });
    await vi.waitFor(() =>
      http
        .expectOne(base + '/customers')
        .flush(
          { error: { message: 'Unavailable' } },
          { status: 503, statusText: 'Unavailable' },
        ),
    );
    await rejection;
    http.expectNone(base + '/customers');
    const next = api.write('PATCH', '/garage', { name: 'Garage' });
    await vi.waitFor(() =>
      http.expectOne(base + '/garage').flush({ data: { _id: 'garage' } }),
    );
    await next;
  });
});

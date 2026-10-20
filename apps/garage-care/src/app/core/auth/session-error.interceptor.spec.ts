import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '@garage-care/shared/data-access';
import { sessionErrorInterceptor } from './session-error.interceptor';
describe('Session error interceptor', () => {
  const invalidateSession = vi.fn();
  beforeEach(() => {
    invalidateSession.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthApi, useValue: { invalidateSession } },
      ],
    });
  });
  for (const status of [401, 403, 503]) {
    it('handles HTTP ' + status + ' without retrying the request', async () => {
      const request = firstValueFrom(
        TestBed.inject(HttpClient).get('/api/v1/customers'),
      );
      const rejected = expect(request).rejects.toMatchObject({ status });
      const http = TestBed.inject(HttpTestingController);
      http
        .expectOne('/api/v1/customers')
        .flush({}, { status, statusText: 'Request failed' });
      await rejected;
      expect(invalidateSession).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
      http.verify();
    });
  }
});

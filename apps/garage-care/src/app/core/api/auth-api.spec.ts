import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthApi } from './auth-api';

describe('AuthApi', () => {
  it('obtains CSRF before login and sends cookie credentials without garage identifiers', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(AuthApi);
    const http = TestBed.inject(HttpTestingController);
    const result = api.login('owner@example.com', 'test-password');
    const csrf = http.expectOne('/api/v1/auth/csrf');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ data: { csrfToken: 'anonymous-csrf' } });
    await Promise.resolve();
    const login = http.expectOne('/api/v1/auth/login');
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.get('X-CSRF-Token')).toBe('anonymous-csrf');
    expect(login.request.body).toEqual({
      email: 'owner@example.com',
      password: 'test-password',
    });
    login.flush({
      data: {
        user: { id: 'owner-id', email: 'owner@example.com' },
        csrfToken: 'session-csrf',
      },
    });
    await result;
    expect(api.user()?.id).toBe('owner-id');
    http.verify();
  });
});

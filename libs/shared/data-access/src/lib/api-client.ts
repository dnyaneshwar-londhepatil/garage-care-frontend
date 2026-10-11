import { Injectable, InjectionToken, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponse, ListQuery, Page } from './contracts';

export const API_BASE_URL = new InjectionToken<string>(
  'GarageCare API base URL',
  { providedIn: 'root', factory: () => '/api/v1' },
);

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'Cannot reach the server. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Sign in again.';
    if (error.status === 429)
      return 'Too many requests. Please wait before trying again.';
    if (typeof error.error?.error?.message === 'string')
      return error.error.error.message;
  }
  return 'The request could not be completed. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  private csrfToken = '';
  private queue: Promise<unknown> = Promise.resolve();
  private readonly options = { withCredentials: true, transferCache: false };

  read<T>(path: string): Promise<T> {
    return firstValueFrom(
      this.http.get<ApiResponse<T>>(this.url(path), this.options),
    ).then((result) => result.data);
  }
  list<T>(path: string, query: ListQuery = {}): Promise<Page<T>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '')
        params = params.set(key, String(value));
    return firstValueFrom(
      this.http.get<Page<T>>(this.url(path), { ...this.options, params }),
    );
  }
  blob(path: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(this.url(path), { ...this.options, responseType: 'blob' }),
    );
  }
  setCsrf(token: string): void {
    this.csrfToken = token;
  }
  clearCsrf(): void {
    this.csrfToken = '';
  }

  // Serialize writes so CSRF issuance/session rotation cannot race in one app instance.
  write<T>(
    method: 'POST' | 'PATCH',
    path: string,
    body: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const operation = this.queue.then(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!this.csrfToken)
          this.csrfToken = await this.read<{ csrfToken: string }>(
            '/auth/csrf',
          ).then((data) => data.csrfToken);
        const headers: Record<string, string> = {
          'X-CSRF-Token': this.csrfToken,
        };
        if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
        try {
          const response = await firstValueFrom(
            this.http.request<ApiResponse<T>>(method, this.url(path), {
              ...this.options,
              body,
              headers,
            }),
          );
          const data = response?.data;
          if (path === '/auth/logout' || path === '/auth/reset-password')
            this.clearCsrf();
          else if (
            data &&
            typeof data === 'object' &&
            'csrfToken' in data &&
            typeof data.csrfToken === 'string'
          )
            this.setCsrf(data.csrfToken);
          return data;
        } catch (error) {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 403 &&
            error.error?.error?.code === 'CSRF_INVALID' &&
            attempt === 0
          ) {
            this.clearCsrf();
            continue;
          }
          if (error instanceof HttpErrorResponse && error.status === 401)
            this.clearCsrf();
          throw error;
        }
      }
      throw new Error('CSRF request failed');
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  private url(path: string): string {
    return this.baseUrl + path;
  }
}

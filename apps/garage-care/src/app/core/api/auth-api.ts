import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface AuthResponse {
  data: { user: { id: string; email: string }; csrfToken: string };
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private csrfToken = '';
  readonly user = signal<{ id: string; email: string } | null>(null);

  async login(email: string, password: string): Promise<void> {
    const csrf = await firstValueFrom(
      this.http.get<{ data: { csrfToken: string } }>('/api/v1/auth/csrf', {
        withCredentials: true,
        transferCache: false,
      }),
    );
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        '/api/v1/auth/login',
        { email, password },
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrf.data.csrfToken },
        },
      ),
    );
    this.csrfToken = response.data.csrfToken;
    this.user.set(response.data.user);
  }
}

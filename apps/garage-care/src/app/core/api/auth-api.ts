import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistrationInput {
  owner: { email: string; password: string; fullName?: string };
  garage: {
    name: string;
    phone: string;
    registrationMode: 'unregistered' | 'regular' | 'composition';
    gstin?: string;
    address: {
      line1: string;
      city: string;
      state: string;
      stateCode: string;
      postalCode: string;
      country: 'IN';
    };
  };
}

interface AuthResponse {
  data: { user: { id: string; email: string }; csrfToken: string };
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private csrfToken = '';
  readonly user = signal<{ id: string; email: string } | null>(null);

  async login(email: string, password: string): Promise<void> {
    return this.authenticate('login', { email, password });
  }

  async register(input: RegistrationInput): Promise<void> {
    return this.authenticate('register', input);
  }

  private async authenticate(
    endpoint: 'login' | 'register',
    input: RegistrationInput | { email: string; password: string },
  ): Promise<void> {
    const csrf = await firstValueFrom(
      this.http.get<{ data: { csrfToken: string } }>(
        `${environment.apiBaseUrl}/auth/csrf`,
        {
          withCredentials: true,
          transferCache: false,
        },
      ),
    );
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.apiBaseUrl}/auth/${endpoint}`,
        input,
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

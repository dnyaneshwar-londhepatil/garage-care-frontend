import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from './api-client';
import { Garage, Owner, RegistrationInput, SessionData } from './contracts';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);
  readonly user = signal<Owner | null>(null);
  readonly garage = signal<Garage | null>(null);
  async login(email: string, password: string): Promise<void> {
    this.accept(
      await this.api.write<SessionData>('POST', '/auth/login', {
        email,
        password,
      }),
    );
  }
  async register(input: RegistrationInput): Promise<void> {
    this.accept(
      await this.api.write<SessionData>('POST', '/auth/register', input),
    );
  }
  async me(): Promise<SessionData> {
    try {
      const data = await this.api.read<SessionData>('/auth/me');
      this.accept(data);
      return data;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401)
        this.clear();
      throw error;
    }
  }
  async refresh(): Promise<void> {
    await this.api.write('POST', '/auth/refresh', {});
  }
  async logout(): Promise<void> {
    await this.api.write('POST', '/auth/logout', {});
    this.clear();
  }
  forgotPassword(email: string): Promise<{ message: string }> {
    return this.api.write('POST', '/auth/forgot-password', { email });
  }
  async resetPassword(token: string, password: string): Promise<void> {
    await this.api.write('POST', '/auth/reset-password', { token, password });
    this.clear();
  }
  private accept(data: SessionData): void {
    this.user.set(data.user);
    this.garage.set(data.garage);
  }
  private clear(): void {
    this.user.set(null);
    this.garage.set(null);
    this.api.clearCsrf();
  }
}

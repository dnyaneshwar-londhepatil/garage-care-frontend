import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from '@garage-care/shared/data-access';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  readonly ready = signal(false);
  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly notice = signal('');

  invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  async submit(): Promise<void> {
    if (this.pending()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notice.set('Please correct the highlighted fields.');
      return;
    }
    this.pending.set(true);
    this.notice.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.api.login(email, password);
      this.form.controls.password.reset();
      this.notice.set('Signed in successfully.');
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.notice.set(
        error instanceof HttpErrorResponse && error.status === 401
          ? 'Email or password is incorrect.'
          : 'Unable to sign in. Check that the local backend is running and try again.',
      );
    } finally {
      this.pending.set(false);
    }
  }
  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

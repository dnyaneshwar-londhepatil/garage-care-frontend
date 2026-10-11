import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from '@garage-care/shared/data-access';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
  readonly ready = signal(false);
  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group(
    {
      fullName: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.maxLength(100),
        ],
      ],
      garageName: [
        '',
        [
          Validators.required,
          Validators.pattern(/\S/),
          Validators.maxLength(150),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(128),
          Validators.pattern(/^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
      updates: [{ value: false, disabled: true }],
    },
    {
      validators: (group) => {
        const errors: Record<string, boolean> = {};
        if (
          group.get('password')?.value !== group.get('confirmPassword')?.value
        )
          errors['passwordMismatch'] = true;

        return Object.keys(errors).length ? errors : null;
      },
    },
  );
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly notice = signal('');
  private readonly password = toSignal(
    this.form.controls.password.valueChanges,
    { initialValue: '' },
  );
  readonly rules = computed(() => [
    {
      label: '12–128 characters',
      met: this.password().length >= 12 && this.password().length <= 128,
    },
    { label: '1 number', met: /\d/.test(this.password()) },
    {
      label: '1 special character',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(this.password()),
    },
  ]);

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return (
      (control.touched || this.submitted()) &&
      (control.invalid ||
        (name === 'confirmPassword' && this.form.hasError('passwordMismatch')))
    );
  }

  async submit(): Promise<void> {
    if (this.pending()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notice.set('Please correct the highlighted fields.');
      return;
    }
    const value = this.form.getRawValue();
    this.pending.set(true);
    this.notice.set('');
    try {
      await this.auth.register({
        owner: {
          email: value.email.trim(),
          password: value.password,
          fullName: value.fullName.trim(),
        },
        garage: {
          name: value.garageName.trim(),
          phone: '+91' + value.phone,
        },
      });
      this.form.controls.password.reset();
      this.form.controls.confirmPassword.reset();
      this.notice.set('Account created. Opening your dashboard.');
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      this.notice.set(
        status === 409
          ? 'An account with this email already exists. Please sign in.'
          : status === 400
            ? 'Registration details were rejected. Check your garage details.'
            : status === 403
              ? 'Your security session expired. Please try again.'
              : status === 429
                ? 'Too many attempts. Please try again later.'
                : 'Account creation could not be confirmed. Check the local backend, or sign in before trying again.',
      );
    } finally {
      this.pending.set(false);
    }
  }
  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

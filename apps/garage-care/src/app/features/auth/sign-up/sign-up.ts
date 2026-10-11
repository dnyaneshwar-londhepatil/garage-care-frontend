import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
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
          Validators.minLength(8),
          Validators.pattern(/^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
      updates: [false],
    },
    {
      validators: (group) =>
        group.get('password')?.value === group.get('confirmPassword')?.value
          ? null
          : { passwordMismatch: true },
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
    { label: '8+ characters', met: this.password().length >= 8 },
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

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notice.set('Please correct the highlighted fields.');
      return;
    }
    this.notice.set(
      'Your details pass the preview checks. No account has been created. Registration will be available when the secure sign-up service and garage setup are connected.',
    );
  }

  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

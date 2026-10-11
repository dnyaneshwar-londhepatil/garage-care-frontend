import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/),
        ],
      ],
      confirmation: ['', Validators.required],
    },
    {
      validators: (group) =>
        group.get('password')?.value === group.get('confirmation')?.value
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
    { label: '1+ number', met: /\d/.test(this.password()) },
    {
      label: '1+ special symbol',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(this.password()),
    },
  ]);
  readonly strength = computed(() =>
    !this.password()
      ? 'Not evaluated'
      : ['Weak', 'Weak', 'Fair', 'Strong'][
          this.rules().filter((rule) => rule.met).length
        ],
  );
  invalid(name: 'password' | 'confirmation'): boolean {
    const control = this.form.controls[name];
    return (
      (control.touched || this.submitted()) &&
      (control.invalid ||
        (name === 'confirmation' && this.form.hasError('passwordMismatch')))
    );
  }
  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.notice.set(
      this.form.invalid
        ? 'Please correct the highlighted fields.'
        : 'This is a frontend preview. Your password has not been changed. Reset-link validation and password updates require the secure service.',
    );
  }
  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

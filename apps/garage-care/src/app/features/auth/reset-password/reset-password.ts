import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApi, apiErrorMessage } from '@garage-care/shared/data-access';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  readonly ready = signal(false);
  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
  private readonly api = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  readonly pending = signal(false);
  readonly completed = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(128),
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
    {
      label: '12–128 characters',
      met: this.password().length >= 12 && this.password().length <= 128,
    },
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
  async submit(): Promise<void> {
    if (this.pending() || this.completed()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notice.set('Please correct the highlighted fields.');
      return;
    }
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token || token.length < 20 || token.length > 200) {
      this.notice.set(
        'Reset link is missing or invalid. Request a new reset link.',
      );
      return;
    }
    this.pending.set(true);
    this.notice.set('');
    try {
      await this.api.resetPassword(token, this.form.controls.password.value);
      this.form.reset();
      this.completed.set(true);
      this.notice.set(
        'Password updated successfully. Sign in with your new password.',
      );
    } catch (error) {
      this.notice.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }
  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

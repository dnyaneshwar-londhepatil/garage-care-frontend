import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi, apiErrorMessage } from '@garage-care/shared/data-access';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  readonly ready = signal(false);
  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
  private readonly api = inject(AuthApi);
  readonly pending = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly submitted = signal(false);
  readonly notice = signal('');
  invalid(): boolean {
    return (
      this.form.controls.email.invalid &&
      (this.form.controls.email.touched || this.submitted())
    );
  }
  async submit(): Promise<void> {
    if (this.pending()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notice.set('Enter a valid email address to continue.');
      return;
    }
    this.pending.set(true);
    this.notice.set('');
    try {
      const response = await this.api.forgotPassword(
        this.form.controls.email.value,
      );
      this.notice.set(response.message);
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

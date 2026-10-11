import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
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
  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.notice.set(
      this.form.invalid
        ? 'Enter a valid email address to continue.'
        : 'This is a frontend preview. No reset email has been sent. Password recovery will be available when the secure service is connected.',
    );
  }
  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private readonly fb = inject(FormBuilder);
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

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.notice.set(
      this.form.invalid
        ? 'Please correct the highlighted fields.'
        : 'Sign-in is not connected in this frontend preview. No session has been created.',
    );
  }

  unavailable(item: string): void {
    this.notice.set(`${item} is not available in this frontend preview yet.`);
  }
}

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from '@garage-care/shared/data-access';
import { ForgotPassword } from './forgot-password';
describe('ForgotPassword', () => {
  const forgotPassword = vi.fn();
  beforeEach(() => {
    forgotPassword.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { forgotPassword } },
      ],
    });
  });
  it('rejects invalid input and never submits it', async () => {
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    await component.submit();
    expect(component.invalid()).toBe(true);
    expect(forgotPassword).not.toHaveBeenCalled();
  });
  it('blocks duplicate submission and shows the server message after success', async () => {
    let complete!: (value: { message: string }) => void;
    forgotPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    component.form.setValue({ email: 'owner@example.com' });
    const pending = component.submit();
    await component.submit();
    expect(forgotPassword).toHaveBeenCalledTimes(1);
    expect(component.notice()).toBe('');
    complete({ message: 'If the account exists, a reset email will be sent.' });
    await pending;
    expect(component.notice()).toContain('If the account exists');
    expect(component.pending()).toBe(false);
  });
  it('reports unconfigured email instead of success', async () => {
    forgotPassword.mockRejectedValue(
      new HttpErrorResponse({
        status: 503,
        error: {
          error: { message: 'Password reset email is not configured.' },
        },
      }),
    );
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    component.form.setValue({ email: 'owner@example.com' });
    await component.submit();
    expect(component.notice()).toContain('not configured');
  });
});

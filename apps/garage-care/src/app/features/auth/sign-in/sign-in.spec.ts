import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SignIn } from './sign-in';
import { AuthApi } from '@garage-care/shared/data-access';
import { HttpErrorResponse } from '@angular/common/http';

describe('SignIn', () => {
  const login = vi.fn();
  beforeEach(() => {
    login.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApi, useValue: { login } }],
    });
  });
  it('rejects invalid input without sending credentials', async () => {
    const component = TestBed.createComponent(SignIn).componentInstance;
    await component.submit();
    expect(component.invalid('email')).toBe(true);
    expect(login).not.toHaveBeenCalled();
  });
  it('navigates only after backend login succeeds and clears the password', async () => {
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    login.mockResolvedValue(undefined);
    const component = TestBed.createComponent(SignIn).componentInstance;
    component.form.patchValue({ email: 'owner@example.com', password: 'abc' });
    await component.submit();
    expect(login).toHaveBeenCalledWith('owner@example.com', 'abc');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(component.form.controls.password.value).toBe('');
  });
  it('reports rejected credentials without navigating', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    login.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
    const component = TestBed.createComponent(SignIn).componentInstance;
    component.form.patchValue({ email: 'owner@example.com', password: 'abc' });
    await component.submit();
    expect(component.notice()).toContain('incorrect');
    expect(navigate).not.toHaveBeenCalled();
    expect(component.pending()).toBe(false);
  });
});

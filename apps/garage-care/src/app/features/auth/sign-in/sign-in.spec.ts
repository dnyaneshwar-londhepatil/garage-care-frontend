import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([])] }),
  );

  it('rejects empty fields and malformed email', () => {
    const component = TestBed.createComponent(SignIn).componentInstance;
    component.submit();
    expect(component.invalid('email')).toBe(true);
    expect(component.invalid('password')).toBe(true);
    component.form.patchValue({
      email: 'invalid',
      password: 'existing-password',
    });
    expect(component.form.invalid).toBe(true);
  });

  it('accepts existing passwords without applying registration rules and creates no session', () => {
    const component = TestBed.createComponent(SignIn).componentInstance;
    component.form.patchValue({
      email: 'owner@example.com',
      password: 'abc',
      rememberMe: true,
    });
    component.submit();
    expect(component.form.valid).toBe(true);
    expect(component.notice()).toContain('No session has been created');
  });
});

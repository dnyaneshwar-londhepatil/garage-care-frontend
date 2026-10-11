import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResetPassword } from './reset-password';
describe('ResetPassword', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([])] }),
  );
  it('rejects weak passwords and mismatches', () => {
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({ password: 'short', confirmation: 'short' });
    component.submit();
    expect(component.invalid('password')).toBe(true);
    component.form.setValue({
      password: 'Workshop1!',
      confirmation: 'Different1!',
    });
    expect(component.form.hasError('passwordMismatch')).toBe(true);
  });
  it('updates the checklist and never reports a password change', () => {
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({
      password: 'Workshop1!',
      confirmation: 'Workshop1!',
    });
    expect(component.strength()).toBe('Strong');
    expect(component.rules().every((rule) => rule.met)).toBe(true);
    component.submit();
    expect(component.form.valid).toBe(true);
    expect(component.notice()).toContain('Your password has not been changed');
    component.form.patchValue({ password: '' });
    expect(component.strength()).toBe('Not evaluated');
  });
});

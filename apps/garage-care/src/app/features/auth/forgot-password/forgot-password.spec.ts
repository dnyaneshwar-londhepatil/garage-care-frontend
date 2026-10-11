import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPassword } from './forgot-password';
describe('ForgotPassword', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([])] }),
  );
  it('rejects empty and malformed email', () => {
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    component.submit();
    expect(component.invalid()).toBe(true);
    component.form.setValue({ email: 'invalid' });
    expect(component.form.invalid).toBe(true);
  });
  it('does not report email delivery for valid preview input', () => {
    const component = TestBed.createComponent(ForgotPassword).componentInstance;
    component.form.setValue({ email: 'owner@example.com' });
    component.submit();
    expect(component.form.valid).toBe(true);
    expect(component.notice()).toContain('No reset email has been sent');
  });
});

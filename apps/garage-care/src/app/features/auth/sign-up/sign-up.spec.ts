import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignUp } from './sign-up';

describe('SignUp', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([])] }),
  );
  const validDetails = {
    fullName: 'Rajesh Sharma',
    garageName: 'Apex Auto Garage',
    email: 'owner@example.com',
    phone: '9876543210',
    password: 'Workshop1!',
    confirmPassword: 'Workshop1!',
    terms: true,
    updates: false,
  };

  it('rejects invalid input and password mismatches', () => {
    const component = TestBed.createComponent(SignUp).componentInstance;
    component.submit();
    expect(component.form.invalid).toBe(true);
    expect(component.invalid('email')).toBe(true);
    component.form.setValue({
      ...validDetails,
      confirmPassword: 'Different1!',
    });
    expect(component.form.hasError('passwordMismatch')).toBe(true);
    component.form.patchValue({
      confirmPassword: validDetails.password,
      phone: '1234567890',
    });
    expect(component.form.controls.phone.invalid).toBe(true);
    component.form.patchValue({ fullName: '   ' });
    expect(component.form.controls.fullName.invalid).toBe(true);
  });

  it('validates details without claiming account creation or requiring marketing consent', () => {
    const component = TestBed.createComponent(SignUp).componentInstance;
    component.form.setValue(validDetails);
    component.submit();
    expect(component.form.valid).toBe(true);
    expect(component.notice()).toContain('No account has been created');
    component.form.patchValue({ terms: false });
    expect(component.form.invalid).toBe(true);
  });

  it('toggles password visibility using accessible controls', async () => {
    const fixture = TestBed.createComponent(SignUp);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#password');
    expect(input?.type).toBe('password');
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Show password"]')
      ?.click();
    await fixture.whenStable();
    expect(input?.type).toBe('text');
    expect(
      element.querySelector('button[aria-label="Hide password"]'),
    ).not.toBeNull();
  });
});

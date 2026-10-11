import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { AuthApi } from '@garage-care/shared/data-access';
import { SignUp } from './sign-up';

describe('SignUp', () => {
  const register = vi.fn();
  const details = {
    fullName: 'Test Owner',
    garageName: 'Apex Auto Garage',
    email: 'owner@example.com',
    phone: '9876543210',
    password: 'WorkshopTest1!',
    confirmPassword: 'WorkshopTest1!',
    terms: true,
  };
  beforeEach(() => {
    register.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { register } },
      ],
    });
  });
  it('rejects missing owner details and short passwords', async () => {
    const component = TestBed.createComponent(SignUp).componentInstance;
    await component.submit();
    expect(register).not.toHaveBeenCalled();
    component.form.patchValue({
      ...details,
      password: 'Short1!',
      confirmPassword: 'Short1!',
    });
    expect(component.form.invalid).toBe(true);
    component.form.patchValue(details);
    expect(component.form.valid).toBe(true);
  });
  it('maps strict registration data, prevents duplicate requests and clears secrets after success', async () => {
    const component = TestBed.createComponent(SignUp).componentInstance;
    component.form.patchValue(details);
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    let finish!: () => void;
    register.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const submission = component.submit();
    await component.submit();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      owner: {
        email: details.email,
        password: details.password,
        fullName: details.fullName,
      },
      garage: {
        name: details.garageName,
        phone: '+919876543210',
      },
    });
    finish();
    await submission;
    expect(component.form.controls.password.value).toBe('');
    expect(component.form.controls.confirmPassword.value).toBe('');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(component.pending()).toBe(false);
  });
  it('reports duplicate-email failure without claiming success or navigating', async () => {
    const component = TestBed.createComponent(SignUp).componentInstance;
    component.form.patchValue(details);
    register.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    await component.submit();
    expect(component.notice()).toContain('already exists');
    expect(navigate).not.toHaveBeenCalled();
    expect(component.pending()).toBe(false);
  });
});

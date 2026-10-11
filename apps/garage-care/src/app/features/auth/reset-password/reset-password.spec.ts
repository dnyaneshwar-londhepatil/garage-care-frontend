import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { AuthApi } from '@garage-care/shared/data-access';
import { ResetPassword } from './reset-password';
describe('ResetPassword', () => {
  const resetPassword = vi.fn();
  const route = { snapshot: { queryParamMap: convertToParamMap({}) } };
  beforeEach(() => {
    resetPassword.mockReset();
    route.snapshot.queryParamMap = convertToParamMap({});
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthApi, useValue: { resetPassword } },
      ],
    });
  });
  it('rejects weak passwords, mismatches and missing tokens without HTTP', async () => {
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({ password: 'short', confirmation: 'short' });
    await component.submit();
    expect(component.invalid('password')).toBe(true);
    component.form.setValue({
      password: 'WorkshopTest1!',
      confirmation: 'WorkshopTest1!',
    });
    expect(component.rules().every((rule) => rule.met)).toBe(true);
    await component.submit();
    expect(component.notice()).toContain('Reset link is missing');
    expect(resetPassword).not.toHaveBeenCalled();
  });
  it('passes the link token, clears passwords only after success and prevents repeat submission', async () => {
    route.snapshot.queryParamMap = convertToParamMap({
      token: 'valid-reset-token-of-32-characters',
    });
    resetPassword.mockResolvedValue(undefined);
    const component = TestBed.createComponent(ResetPassword).componentInstance;
    component.form.setValue({
      password: 'WorkshopTest1!',
      confirmation: 'WorkshopTest1!',
    });
    await component.submit();
    expect(resetPassword).toHaveBeenCalledWith(
      'valid-reset-token-of-32-characters',
      'WorkshopTest1!',
    );
    expect(component.form.controls.password.value).toBe('');
    expect(component.completed()).toBe(true);
    await component.submit();
    expect(resetPassword).toHaveBeenCalledTimes(1);
  });
});

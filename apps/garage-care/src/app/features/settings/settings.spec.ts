import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthApi, GarageApi } from '@garage-care/shared/data-access';
import { Settings } from './settings';
describe('Garage settings', () => {
  const update = vi.fn();
  const garage = { _id: 'g1', name: 'Garage', phone: '+919876543210' };
  const current = signal(garage);
  beforeEach(() => {
    update
      .mockReset()
      .mockImplementation(async (payload) => ({ ...garage, ...payload }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        { provide: AuthApi, useValue: { user: signal(null), garage: current } },
        {
          provide: GarageApi,
          useValue: { get: vi.fn().mockResolvedValue(garage), update },
        },
      ],
    });
  });
  it('saves the basic profile without fabricating address or GST values and updates the shell identity', async () => {
    const component = TestBed.createComponent(Settings).componentInstance;
    await component.load();
    component.form.controls.name.setValue('Updated Garage');
    await component.save();
    expect(update).toHaveBeenCalledWith({
      name: 'Updated Garage',
      phone: '+919876543210',
    });
    expect(current().name).toBe('Updated Garage');
  });
  it('blocks incomplete addresses', async () => {
    const component = TestBed.createComponent(Settings).componentInstance;
    await component.load();
    component.form.controls.city.setValue('Pune');
    await component.save();
    expect(update).not.toHaveBeenCalled();
    expect(component.error()).toContain('street address');
  });
  it('saves a complete India address without tax or account changes', async () => {
    const component = TestBed.createComponent(Settings).componentInstance;
    await component.load();
    component.form.patchValue({
      line1: '123 Road',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      postalCode: '411001',
    });
    await component.save();
    expect(update).toHaveBeenCalledWith({
      name: 'Garage',
      phone: '+919876543210',
      address: {
        line1: '123 Road',
        city: 'Pune',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '411001',
        country: 'IN',
      },
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  ServicesApi,
  CustomersApi,
  VehiclesApi,
  PartsApi,
} from '@garage-care/shared/data-access';
import { NewServiceJob, dateToIso, moneyToPaise } from './new-service-job';

describe('NewServiceJob', () => {
  const customer = { _id: 'c', name: 'Customer', phone: '+919000000000' };
  const vehicle = {
    _id: 'v',
    customerId: 'c',
    vehicleType: 'car' as const,
    registrationNumber: 'MH12AB1234',
    brand: 'Make',
    model: 'Model',
  };
  function setup(preview = false) {
    const create = vi.fn().mockResolvedValue({
      _id: 'job',
      serviceNumber: 'JOB-1',
      status: 'draft',
      version: 0,
      customerId: 'c',
      vehicleId: 'v',
      serviceDate: dateToIso('2026-10-14'),
      items: [],
    });
    const update = vi.fn().mockRejectedValue(new Error('Start failed'));
    const list = vi
      .fn()
      .mockResolvedValue({ data: [], page: { nextCursor: null } });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { preview } } },
        },
        { provide: ServicesApi, useValue: { create, update } },
        { provide: CustomersApi, useValue: { list } },
        { provide: VehiclesApi, useValue: { list } },
        { provide: PartsApi, useValue: { list } },
      ],
    });
    const fixture = TestBed.createComponent(NewServiceJob);
    const component = fixture.componentInstance;
    component.form.enable();
    component.form.controls.serviceDate.setValue('2026-10-14');
    component.customer.set(customer);
    component.vehicle.set(vehicle);
    return { component, create, update, list };
  }
  it('converts INR exactly and preserves India calendar dates', () => {
    expect(moneyToPaise('2450.09')).toBe(245009);
    expect(moneyToPaise('2.999')).toBeNaN();
    expect(dateToIso('2026-10-14')).toBe('2026-10-13T18:30:00.000Z');
  });
  it('blocks unrelated vehicles and fractional odometer readings', async () => {
    const { component, create } = setup();
    component.vehicle.set({ ...vehicle, customerId: 'other' });
    await component.save('draft');
    expect(create).not.toHaveBeenCalled();
    component.vehicle.set(vehicle);
    component.form.controls.odometerKm.setValue('1.5');
    await component.save('draft');
    expect(create).not.toHaveBeenCalled();
  });
  it('does not submit preview jobs', async () => {
    const { component, create } = setup(true);
    await component.save('draft');
    expect(create).not.toHaveBeenCalled();
    expect(component.notice()).toContain('Preview only');
  });
  it('retries starting a saved draft without creating duplicates', async () => {
    const { component, create, update } = setup();
    await component.save('start');
    expect(component.saved()?._id).toBe('job');
    await component.save('start');
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith('job', {
      version: 0,
      status: 'in_progress',
    });
  });
  it('keeps form input after a failed save', async () => {
    const { component, create } = setup();
    create.mockRejectedValue(new Error('Network'));
    component.form.controls.complaint.setValue('Brake noise');
    await component.save('draft');
    expect(component.saved()).toBeNull();
    expect(component.form.controls.complaint.value).toBe('Brake noise');
    expect(component.busy()).toBe(false);
  });
  it('validates discounts and whole quantities', () => {
    const { component } = setup();
    component.openLine('labour');
    component.lineForm.patchValue({
      description: 'Inspection',
      price: '500',
      discount: '501',
    });
    component.addLine();
    expect(component.items()).toHaveLength(0);
    component.lineForm.controls.discount.setValue('50');
    component.addLine();
    expect(component.labourSubtotal()).toBe(45000);
  });
});

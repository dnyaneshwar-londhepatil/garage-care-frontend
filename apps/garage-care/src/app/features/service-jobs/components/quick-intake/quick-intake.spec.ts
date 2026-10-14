import { TestBed } from '@angular/core/testing';
import {
  CustomersApi,
  VehiclesApi,
  ServicesApi,
} from '@garage-care/shared/data-access';
import { QuickIntake, intakeDate, normalizePlate } from './quick-intake';

describe('QuickIntake', () => {
  const customer = { _id: 'c', name: 'Test Customer', phone: '+919876543210' };
  const vehicle = {
    _id: 'v',
    customerId: 'c',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car' as const,
  };
  function setup(preview = false) {
    const list = vi
      .fn()
      .mockResolvedValue({ data: [], page: { nextCursor: null } });
    const createCustomer = vi.fn().mockResolvedValue(customer);
    const createVehicle = vi.fn().mockResolvedValue(vehicle);
    const create = vi
      .fn()
      .mockResolvedValue({ _id: 'j', status: 'draft', version: 0, items: [] });
    const update = vi.fn().mockRejectedValue(new Error('Start failed'));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CustomersApi,
          useValue: {
            list,
            create: createCustomer,
            get: vi.fn().mockResolvedValue(customer),
          },
        },
        { provide: VehiclesApi, useValue: { list, create: createVehicle } },
        { provide: ServicesApi, useValue: { create, update } },
      ],
    });
    const fixture = TestBed.createComponent(QuickIntake);
    fixture.componentRef.setInput('previewMode', preview);
    const component = fixture.componentInstance;
    component.form.setValue({
      name: 'Test Customer',
      phone: '9876543210',
      registrationNumber: 'MH 12 AB-1234',
      brand: 'Honda',
      model: 'City',
      vehicleType: 'car',
      serviceDate: '2026-10-14',
      complaint: 'Oil change',
    });
    return { component, create, update, list, createCustomer, createVehicle };
  }
  it('normalizes registration and preserves India calendar dates', () => {
    expect(normalizePlate('mh 12-ab 1234')).toBe('MH12AB1234');
    expect(intakeDate('2026-10-14')).toBe('2026-10-13T18:30:00.000Z');
  });
  it('blocks invalid mobile numbers before any API write', async () => {
    const { component, createCustomer } = setup();
    component.form.controls.phone.setValue('123');
    await component.save(false);
    expect(createCustomer).not.toHaveBeenCalled();
    expect(component.error()).toContain('highlighted');
  });
  it('never creates preview records', async () => {
    const { component, create, createCustomer } = setup(true);
    await component.save(true);
    expect(create).not.toHaveBeenCalled();
    expect(createCustomer).not.toHaveBeenCalled();
    expect(component.notice()).toContain('Preview only');
  });
  it('retains created records and draft for retrying failed start', async () => {
    const { component, create, update, createCustomer, createVehicle } =
      setup();
    await component.save(true);
    await component.save(true);
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createVehicle).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(component.error()).toContain('draft is saved');
  });
  it('reuses saved customer after vehicle creation fails', async () => {
    const { component, createCustomer, createVehicle, create } = setup();
    createVehicle.mockRejectedValueOnce(new Error('Vehicle failed'));
    await component.save(true);
    expect(component.customer()?._id).toBe('c');
    expect(create).not.toHaveBeenCalled();
    await component.save(true);
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createVehicle).toHaveBeenCalledTimes(2);
  });
  it('rejects a registration belonging to another phone before writing', async () => {
    const { component, list, create } = setup();
    list.mockResolvedValue({ data: [vehicle], page: { nextCursor: null } });
    component.form.controls.phone.setValue('9123456789');
    await component.save(true);
    expect(create).not.toHaveBeenCalled();
    expect(component.error()).toContain('another customer');
  });
});

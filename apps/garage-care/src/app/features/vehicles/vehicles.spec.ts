import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import {
  AuthApi,
  CustomersApi,
  VehiclesApi,
} from '@garage-care/shared/data-access';
import { Vehicles } from './vehicles';

describe('Vehicles', () => {
  const list = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const get = vi.fn();
  const customerList = vi.fn();
  const customerGet = vi.fn();
  const owner = { _id: 'c1', name: 'Asha Patil', phone: '+919876543210' };
  const vehicle = {
    _id: 'v1',
    customerId: 'c1',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car' as const,
  };
  let data: { preview?: boolean };
  beforeEach(() => {
    data = {};
    list
      .mockReset()
      .mockResolvedValue({ data: [vehicle], page: { nextCursor: null } });
    create.mockReset().mockResolvedValue(vehicle);
    update.mockReset().mockResolvedValue(vehicle);
    get.mockReset().mockResolvedValue(vehicle);
    customerList
      .mockReset()
      .mockResolvedValue({ data: [owner], page: { nextCursor: null } });
    customerGet.mockReset().mockResolvedValue(owner);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
        {
          provide: AuthApi,
          useValue: { user: signal(null), garage: signal(null) },
        },
        { provide: VehiclesApi, useValue: { list, create, update, get } },
        {
          provide: CustomersApi,
          useValue: { list: customerList, get: customerGet },
        },
      ],
    });
  });
  async function intake() {
    const component = TestBed.createComponent(Vehicles).componentInstance;
    await component.open();
    component.selectOwner('c1');
    component.form.patchValue({
      registrationNumber: 'mh 12-ab1234',
      brand: ' Honda ',
      model: ' City ',
      currentKm: 0,
    });
    return component;
  }
  it('normalizes registration and sends the selected customer with a zero odometer', async () => {
    const component = await intake();
    await component.save();
    expect(create).toHaveBeenCalledWith({
      customerId: 'c1',
      registrationNumber: 'MH12AB1234',
      vehicleType: 'car',
      brand: 'Honda',
      model: 'City',
      currentKm: 0,
    });
    expect(component.notice()).toBe('Vehicle saved.');
  });
  it('requires explicit customer selection and whole-number odometer readings', async () => {
    const component = await intake();
    component.selectOwner('');
    await component.save();
    expect(create).not.toHaveBeenCalled();
    component.selectOwner('c1');
    component.form.controls.currentKm.setValue(1.5);
    await component.save();
    expect(create).not.toHaveBeenCalled();
    expect(component.invalid('currentKm')).toBe(true);
  });
  it('refreshes a vehicle before editing and never sends ownership in a PATCH', async () => {
    const component = TestBed.createComponent(Vehicles).componentInstance;
    await component.open(vehicle);
    component.selectOwner('other');
    component.form.controls.model.setValue('City ZX');
    await component.save();
    expect(get).toHaveBeenCalledWith('v1');
    expect(update).toHaveBeenCalledWith('v1', {
      registrationNumber: 'MH12AB1234',
      vehicleType: 'car',
      brand: 'Honda',
      model: 'City ZX',
    });
    expect(component.selectedOwner()?._id).toBe('c1');
  });
  it('searches the backend and joins customer names while paginating', async () => {
    const component = TestBed.createComponent(Vehicles).componentInstance;
    component.search.setValue(' Honda ');
    list.mockResolvedValue({ data: [vehicle], page: { nextCursor: 'v1' } });
    await component.load();
    await component.load(true);
    expect(list).toHaveBeenLastCalledWith({
      limit: 20,
      q: 'Honda',
      cursor: 'v1',
    });
    expect(component.rows()).toHaveLength(1);
    expect(component.owners().get('c1')?.name).toBe('Asha Patil');
  });
  it('loads further customer search pages for owner selection', async () => {
    const component = TestBed.createComponent(Vehicles).componentInstance;
    customerList
      .mockResolvedValueOnce({ data: [owner], page: { nextCursor: 'c1' } })
      .mockResolvedValueOnce({
        data: [{ ...owner, _id: 'c2' }],
        page: { nextCursor: null },
      });
    await component.open();
    await component.findCustomers(true);
    expect(customerList).toHaveBeenLastCalledWith({
      limit: 20,
      q: undefined,
      cursor: 'c1',
    });
    expect(component.choices()).toHaveLength(2);
  });
  it('preserves input after a duplicate registration error', async () => {
    create.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { error: { message: 'Registration already exists' } },
      }),
    );
    const component = await intake();
    await component.save();
    expect(component.formError()).toBe('Registration already exists');
    expect(component.editorOpen()).toBe(true);
    expect(component.busy()).toBe(false);
    expect(component.form.controls.brand.value).toBe(' Honda ');
  });
  it('does not call the backend in preview mode', async () => {
    data.preview = true;
    const component = TestBed.createComponent(Vehicles).componentInstance;
    await component.open();
    component.selectOwner('sample-c0');
    component.form.patchValue({
      registrationNumber: 'MH12XY1234',
      brand: 'Honda',
      model: 'City',
    });
    await component.save();
    expect(component.records()).toHaveLength(6);
    expect(create).not.toHaveBeenCalled();
    expect(customerList).not.toHaveBeenCalled();
    expect(component.notice()).toContain('preview only');
  });
});

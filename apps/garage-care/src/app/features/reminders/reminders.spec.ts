import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import {
  AuthApi,
  RemindersApi,
  VehiclesApi,
  CustomersApi,
} from '@garage-care/shared/data-access';
import { Reminders, reminderDate } from './reminders';
describe('Reminder scheduling', () => {
  const create = vi.fn();
  const update = vi.fn();
  const vehicle = {
    _id: 'v1',
    customerId: 'c1',
    registrationNumber: 'MH12AB1234',
    brand: 'Honda',
    model: 'City',
    vehicleType: 'car' as const,
  };
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ _id: 'r1', status: 'pending' });
    update.mockReset().mockResolvedValue({ _id: 'r1', status: 'cancelled' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: AuthApi,
          useValue: { user: signal(null), garage: signal(null) },
        },
        {
          provide: RemindersApi,
          useValue: {
            create,
            update,
            list: vi
              .fn()
              .mockResolvedValue({ data: [], page: { nextCursor: null } }),
          },
        },
        { provide: VehiclesApi, useValue: {} },
        { provide: CustomersApi, useValue: {} },
      ],
    });
  });
  it('converts India-local dates and rejects invalid calendar dates', () => {
    expect(reminderDate('2026-11-20')).toBe('2026-11-19T18:30:00.000Z');
    expect(reminderDate('2026-02-31')).toBeNull();
  });
  it('derives ownership from the selected vehicle and submits no fabricated schedule or delivery state', async () => {
    const component = TestBed.createComponent(Reminders).componentInstance;
    component.editorOpen.set(true);
    component.selectedVehicle.set(vehicle);
    component.form.setValue({ vehicleId: 'v1', dueDate: '2026-11-20' });
    await component.save();
    expect(create).toHaveBeenCalledWith({
      vehicleId: 'v1',
      customerId: 'c1',
      dueDate: '2026-11-19T18:30:00.000Z',
    });
    expect(component.notice()).toContain('does not confirm delivery');
  });
  it('only submits a cancellation patch after choosing a cancellation target', async () => {
    const component = TestBed.createComponent(Reminders).componentInstance;
    await component.cancel();
    expect(update).not.toHaveBeenCalled();
    component.cancelTarget.set({
      _id: 'r1',
      customerId: 'c1',
      vehicleId: 'v1',
      dueDate: '2026-11-20',
      scheduledAt: '2026-11-13',
      status: 'pending',
    });
    await component.cancel();
    expect(update).toHaveBeenCalledWith('r1', { status: 'cancelled' });
  });
  it('keeps repeat sample schedules idempotent without reactivating cancelled reminders', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { preview: true } } },
    });
    const component = TestBed.createComponent(Reminders).componentInstance;
    await component.load();
    await component.open();
    component.choose('sample-v0');
    component.form.controls.dueDate.setValue('2026-11-21');
    await component.save();
    expect(component.records()).toHaveLength(1);
    component.cancelTarget.set(component.records()[0]);
    await component.cancel();
    await component.open();
    component.choose('sample-v0');
    component.form.controls.dueDate.setValue('2026-11-21');
    await component.save();
    expect(component.records()).toHaveLength(1);
    expect(component.records()[0].status).toBe('cancelled');
    expect(create).not.toHaveBeenCalled();
  });
});

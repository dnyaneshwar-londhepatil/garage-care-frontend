import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AuthApi,
  DashboardApi,
  ServicesApi,
  CustomersApi,
  VehiclesApi,
  RemindersApi,
  InvoicesApi,
  NotificationsApi,
} from '@garage-care/shared/data-access';
import { Dashboard } from './dashboard';

describe('Live dashboard', () => {
  const summary = vi.fn();
  const list = vi.fn();
  const reminders = vi.fn();
  const logout = vi.fn();
  beforeEach(() => {
    summary.mockReset().mockResolvedValue({
      serviceCounts: { draft: 1, inProgress: 1, completed: 0, cancelled: 0 },
      customers: 7,
      upcomingReminders: 0,
      recentInvoices: [],
      revenueSummary: {
        issuedInvoiceTotalPaise: 125050,
        paidTotalPaise: null,
      },
    });
    list.mockReset().mockResolvedValue({
      data: [
        {
          _id: 'job',
          customerId: 'customer',
          vehicleId: 'vehicle',
          complaint: 'Oil change',
          status: 'in_progress',
          version: 1,
        },
      ],
      page: { limit: 20, nextCursor: null },
    });
    reminders
      .mockReset()
      .mockResolvedValue({ data: [], page: { limit: 20, nextCursor: null } });
    logout.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: AuthApi,
          useValue: {
            user: signal({
              id: 'owner',
              email: 'owner@example.com',
              fullName: 'Test Owner',
            }),
            garage: signal({ name: 'Test Garage' }),
            logout,
          },
        },
        { provide: DashboardApi, useValue: { summary } },
        { provide: ServicesApi, useValue: { list } },
        {
          provide: CustomersApi,
          useValue: {
            get: vi.fn().mockResolvedValue({
              name: 'Real Customer',
              phone: '+919876543210',
            }),
          },
        },
        {
          provide: VehiclesApi,
          useValue: {
            get: vi.fn().mockResolvedValue({
              brand: 'Honda',
              model: 'City',
              vehicleType: 'car',
              registrationNumber: 'MH12AB1234',
            }),
          },
        },
        { provide: RemindersApi, useValue: { list: reminders } },
        { provide: InvoicesApi, useValue: {} },
        { provide: NotificationsApi, useValue: {} },
      ],
    });
  });
  it('joins real customer and vehicle records, formats paise and filters loaded jobs', async () => {
    const component = TestBed.createComponent(Dashboard).componentInstance;
    expect(component.jobs()).toEqual([]);
    await component.load();
    expect(component.jobs()[0].name).toBe('Real Customer');
    expect(component.garageName()).toBe('Test Garage');
    expect(component.metrics()[1].value).toContain('1,250.50');
    component.search.setValue('HONDA');
    expect(component.filteredJobs()).toHaveLength(1);
    component.status.setValue('Draft');
    expect(component.filteredJobs()).toEqual([]);
    component.findVehicle();
    expect(component.filteredJobs()).toHaveLength(1);
  });
  it('shows an error without substituting sample data', async () => {
    summary.mockRejectedValue(
      new HttpErrorResponse({
        status: 503,
        error: { error: { message: 'Database unavailable' } },
      }),
    );
    const component = TestBed.createComponent(Dashboard).componentInstance;
    await component.load();
    expect(component.notice()).toBe('Database unavailable');
    expect(component.failed()).toBe(true);
    expect(component.jobs()).toEqual([]);
  });
  it('passes the cursor when loading another page', async () => {
    const component = TestBed.createComponent(Dashboard).componentInstance;
    await component.load();
    component.nextCursor.set('next-id');
    list.mockResolvedValue({ data: [], page: { limit: 20, nextCursor: null } });
    await component.load(true);
    expect(list).toHaveBeenLastCalledWith({ limit: 100, cursor: 'next-id' });
    expect(component.jobs()).toHaveLength(1);
  });
  it('uses India-local time for the greeting and current date', () => {
    const component = TestBed.createComponent(Dashboard).componentInstance;
    component.now.set(new Date('2026-10-14T03:30:00Z'));
    expect(component.greeting()).toBe('Good morning');
    expect(component.firstName()).toBe('Test');
    component.now.set(new Date('2026-10-14T08:30:00Z'));
    expect(component.greeting()).toBe('Good afternoon');
    component.now.set(new Date('2026-10-14T19:30:00Z'));
    expect(component.greeting()).toBe('Good morning');
    expect(component.today()).toContain('15');
  });
});

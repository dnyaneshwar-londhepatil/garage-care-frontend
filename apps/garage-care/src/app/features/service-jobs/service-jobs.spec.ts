import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  ServicesApi,
  DashboardApi,
  AuthApi,
  CustomersApi,
  VehiclesApi,
} from '@garage-care/shared/data-access';
import { ServiceJobs } from './service-jobs';
import { csvCell } from './service-jobs.models';

describe('ServiceJobs', () => {
  function setup(preview = true) {
    const list = vi
      .fn()
      .mockResolvedValue({ data: [], page: { limit: 100, nextCursor: null } });
    const summary = vi.fn().mockResolvedValue({
      serviceCounts: { draft: 0, inProgress: 0, completed: 0, cancelled: 0 },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { preview } } },
        },
        { provide: ServicesApi, useValue: { list } },
        { provide: DashboardApi, useValue: { summary } },
        { provide: CustomersApi, useValue: { get: vi.fn() } },
        { provide: VehiclesApi, useValue: { get: vi.fn() } },
        {
          provide: AuthApi,
          useValue: { user: () => null, garage: () => null },
        },
      ],
    });
    const fixture = TestBed.createComponent(ServiceJobs);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, list, summary };
  }
  it('keeps the sample route independent of authenticated API calls', async () => {
    const { component, list, summary } = setup();
    await component.load();
    expect(list).not.toHaveBeenCalled();
    expect(summary).not.toHaveBeenCalled();
    expect(component.rows()).toHaveLength(5);
  });
  it('combines search, status, and vehicle filters and clamps pagination', () => {
    const { component } = setup();
    component.search.setValue('MH 02 EE 4920');
    expect(component.filtered()).toHaveLength(1);
    component.setStatus('completed');
    expect(component.filtered()).toHaveLength(0);
    component.resetFilters();
    component.category.set('scooter');
    expect(component.filtered()[0].customer.name).toBe('Suresh Patil');
    component.page.set(10);
    expect(component.currentPage()).toBe(0);
  });
  it('selects only the current page and clears selection', () => {
    const { component } = setup();
    component.pageSize.set(2);
    component.togglePage();
    expect(component.selected().size).toBe(2);
    expect(component.allSelected()).toBe(true);
    component.page.set(1);
    expect(component.allSelected()).toBe(false);
    component.clearSelection();
    expect(component.selected().size).toBe(0);
  });
  it('shows API failures without substituting sample records', async () => {
    const { component, list } = setup(false);
    list.mockRejectedValue(new Error('Unavailable'));
    await component.load();
    expect(component.error()).toBeTruthy();
    expect(component.rows()).toHaveLength(0);
    expect(component.loading()).toBe(false);
  });
  it('escapes CSV text and prevents user values from executing as spreadsheet formulas', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
    expect(csvCell('  +919000000000')).toBe('"\'  +919000000000"');
    expect(csvCell('Oil "change", wash')).toBe('"Oil ""change"", wash"');
  });
});

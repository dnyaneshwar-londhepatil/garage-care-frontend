import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([])] }),
  );
  it('combines case-insensitive search and status filters and clears both', () => {
    const component = TestBed.createComponent(Dashboard).componentInstance;
    component.search.setValue('HONDA');
    expect(component.filteredJobs().map((job) => job.id)).toEqual(['JOB-024']);
    component.status.setValue('Completed');
    expect(component.filteredJobs()).toEqual([]);
    component.findVehicle();
    expect(component.filteredJobs()).toHaveLength(5);
    component.search.setValue('MH14 EF');
    expect(component.filteredJobs()[0].name).toBe('Arun Kulkarni');
  });
  it('keeps reminders and contact actions explicitly in preview', () => {
    const component = TestBed.createComponent(Dashboard).componentInstance;
    component.preview('Reminder for Amit Trivedi');
    expect(component.notice()).toContain(
      'No record was created, changed, or message sent',
    );
    expect(component.jobs).toHaveLength(5);
  });
});

import { TestBed } from '@angular/core/testing';
import { DashboardOverview } from './dashboard-overview';

describe('DashboardOverview', () => {
  it('shows compact reminder actions and reports a preview request without delivery', () => {
    const fixture = TestBed.createComponent(DashboardOverview);
    fixture.componentRef.setInput('reminders', [
      {
        name: 'Amit Trivedi',
        vehicle: 'Honda City',
        service: 'Periodic service',
        due: 'Due 2 days ago',
        overdue: true,
        status: 'Queued',
        icon: 'chat',
        action: 'Send Reminder',
      },
    ]);
    fixture.detectChanges();
    const actions: string[] = [];
    fixture.componentInstance.previewAction.subscribe((action) =>
      actions.push(action),
    );
    fixture.nativeElement.querySelector('.reminder-actions button').click();
    expect(actions).toEqual(['Reminder for Amit Trivedi']);
    fixture.nativeElement.querySelector('.view-all').click();
    expect(actions).toEqual(['Reminder for Amit Trivedi', 'All reminders']);
    expect(fixture.nativeElement.querySelectorAll('.floor-stat')).toHaveLength(
      2,
    );
    expect(fixture.nativeElement.textContent).toContain('Bay occupancy is not measured');
  });
});

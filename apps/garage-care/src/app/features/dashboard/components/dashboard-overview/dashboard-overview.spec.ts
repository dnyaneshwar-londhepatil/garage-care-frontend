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
    expect(fixture.nativeElement.querySelector('.view-all')).toBeNull();
    expect(fixture.nativeElement.querySelector('.floor')).toBeNull();
  });
});

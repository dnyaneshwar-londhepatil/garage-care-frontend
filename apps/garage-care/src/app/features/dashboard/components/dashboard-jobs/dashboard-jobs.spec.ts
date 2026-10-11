import { TestBed } from '@angular/core/testing';
import { DashboardJobs } from './dashboard-jobs';
import { Job } from '../../dashboard.models';

describe('DashboardJobs', () => {
  it('expands service details and emits contact actions without delivery', () => {
    const job: Job = {
      id: 'JOB-024',
      name: 'Suresh Patil',
      initials: 'SP',
      phone: '+91 98230 11234',
      vehicle: 'Honda Activa 6G',
      registration: 'MH12 AB 4590',
      vehicles: 2,
      status: 'In Progress',
      service: 'Periodic service · Oil change',
    };
    const fixture = TestBed.createComponent(DashboardJobs);
    fixture.componentRef.setInput('jobs', [job]);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.view').click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.job-details').textContent,
    ).toContain(job.service);
    const actions: string[] = [];
    fixture.componentInstance.previewAction.subscribe((action) =>
      actions.push(action),
    );
    fixture.nativeElement.querySelector('.contact-actions button').click();
    expect(actions).toEqual(['WhatsApp to Suresh Patil']);
    fixture.componentRef.setInput('jobs', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain(
      'No matching service jobs',
    );
  });
});

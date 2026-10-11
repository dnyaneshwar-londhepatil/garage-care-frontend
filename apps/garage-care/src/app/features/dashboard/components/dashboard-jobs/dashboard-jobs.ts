import { Component, input, output, signal } from '@angular/core';
import { Job } from '../../dashboard.models';
import { DashboardIcon } from '../dashboard-icon/dashboard-icon';
import { ActionButton } from '@garage-care/shared/ui';
@Component({
  selector: 'app-dashboard-jobs',
  imports: [DashboardIcon, ActionButton],
  templateUrl: './dashboard-jobs.html',
  styleUrl: './dashboard-jobs.scss',
})
export class DashboardJobs {
  readonly jobs = input.required<readonly Job[]>();
  readonly busy = input(false);
  readonly jobAction = output<{
    kind: 'history' | 'whatsapp' | 'pdf';
    job: Job;
  }>();
  readonly selectedJob = signal<Job | null>(null);
  readonly previewAction = output<string>();
  readonly clearFilters = output<void>();
  call(phone: string): void {
    if (/^\+91[6-9]\d{9}$/.test(phone)) window.location.href = 'tel:' + phone;
  }
}

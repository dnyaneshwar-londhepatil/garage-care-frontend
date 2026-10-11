import { Component, input, output, signal } from '@angular/core';
import { Job } from '../../dashboard.models';
import { DashboardIcon } from '../dashboard-icon/dashboard-icon';
@Component({
  selector: 'app-dashboard-jobs',
  imports: [DashboardIcon],
  templateUrl: './dashboard-jobs.html',
  styleUrl: './dashboard-jobs.scss',
})
export class DashboardJobs {
  readonly jobs = input.required<readonly Job[]>();
  readonly selectedJob = signal<Job | null>(null);
  readonly previewAction = output<string>();
  readonly clearFilters = output<void>();
}

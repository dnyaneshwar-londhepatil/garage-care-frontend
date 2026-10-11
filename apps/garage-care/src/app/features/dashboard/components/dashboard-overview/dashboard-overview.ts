import { Component, input, output } from '@angular/core';
import { ActionButton } from '@garage-care/shared/ui';
import { DashboardIcon } from '../dashboard-icon/dashboard-icon';
export interface DashboardReminder {
  id?: string;
  name: string;
  vehicle: string;
  service: string;
  due: string;
  overdue: boolean;
  status: string;
  icon: string;
  action: string;
}
@Component({
  selector: 'app-dashboard-overview',
  imports: [ActionButton, DashboardIcon],
  templateUrl: './dashboard-overview.html',
  styleUrl: './dashboard-overview.scss',
})
export class DashboardOverview {
  readonly reminders = input.required<readonly DashboardReminder[]>();
  readonly total = input(0);
  readonly completedJobs = input(0);
  readonly totalJobs = input(0);
  readonly busy = input(false);
  readonly viewReminder = output<string>();
  readonly previewAction = output<string>();
}

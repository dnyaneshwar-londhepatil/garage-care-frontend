import { Component, input, output } from '@angular/core';
import { ActionButton } from '@garage-care/shared/ui';
import { DashboardIcon } from '../dashboard-icon/dashboard-icon';
export interface DashboardReminder {
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
  readonly previewAction = output<string>();
}

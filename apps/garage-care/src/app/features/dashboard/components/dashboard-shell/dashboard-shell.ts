import { Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from '../dashboard-icon/dashboard-icon';

@Component({
  selector: 'app-dashboard-shell',
  imports: [ReactiveFormsModule, RouterLink, DashboardIcon],
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class DashboardShell {
  readonly search = input.required<FormControl<string>>();
  readonly previewAction = output<string>();
  readonly menuOpen = signal(false);
  readonly navigation = [
    'Dashboard',
    'Service Jobs',
    'Customers',
    'Vehicles',
    'Parts & Services',
    'Invoices',
    'Reminders',
    'Settings',
  ];
  readonly navigationIcons = [
    'space_dashboard',
    'car_repair',
    'group',
    'directions_car',
    'inventory_2',
    'receipt_long',
    'notifications_active',
    'settings',
  ];
  preview(action: string): void {
    this.menuOpen.set(false);
    this.previewAction.emit(action);
  }
}

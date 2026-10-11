import { Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from './dashboard-icon';

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
    'dashboard',
    'wrench',
    'customers',
    'car',
    'parts',
    'invoice',
    'clock',
    'settings',
  ];
  preview(action: string): void {
    this.menuOpen.set(false);
    this.previewAction.emit(action);
  }
}

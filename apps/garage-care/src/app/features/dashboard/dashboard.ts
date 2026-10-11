import { Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardIcon } from './components/dashboard-icon/dashboard-icon';
import { DashboardShell } from './components/dashboard-shell/dashboard-shell';
import { DashboardOverview } from './components/dashboard-overview/dashboard-overview';

import { Job } from './dashboard.models';
import { DashboardJobs } from './components/dashboard-jobs/dashboard-jobs';

@Component({
  selector: 'app-dashboard',
  imports: [
    ReactiveFormsModule,
    DashboardIcon,
    DashboardShell,
    DashboardJobs,
    DashboardOverview,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly notice = signal('');
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('All statuses', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, {
    initialValue: '',
  });
  private readonly statusValue = toSignal(this.status.valueChanges, {
    initialValue: 'All statuses',
  });
  readonly metrics = [
    {
      label: 'Active Jobs',
      value: '08',
      description: 'Currently in progress',
      detail: '+2 waiting in bay queue',
      icon: 'car_repair',
    },
    {
      label: 'Invoices',
      value: '12',
      description: 'Created this month',
      detail: '₹1,48,200 billed',
      icon: 'receipt_long',
    },
    {
      label: 'Customers',
      value: '146',
      description: 'Registered customers',
      detail: '+14 this month',
      icon: 'group',
    },
    {
      label: 'Upcoming Reminders',
      value: '05',
      description: 'Due soon',
      detail: '2 overdue · 3 this week',
      icon: 'notification_important',
    },
  ];
  readonly actions = [
    { title: 'New Service Job', detail: 'Open intake card', icon: 'add_task' },
    {
      title: 'Add Customer',
      detail: 'Phone & GSTIN profile',
      icon: 'person_add',
    },
    {
      title: 'Create Invoice',
      detail: 'Tax & job line items',
      icon: 'post_add',
    },
    {
      title: 'Find Vehicle',
      detail: 'Quick RC & history scan',
      icon: 'search_insights',
    },
  ];
  readonly jobs: Job[] = [
    {
      id: 'JOB-024',
      name: 'Suresh Patil',
      initials: 'SP',
      phone: '+91 98230 11234',
      vehicle: 'Honda Activa 6G',
      vehicleDescription: 'Vehicle 1 of 2',
      registration: 'MH12 AB 4590',
      vehicles: 2,
      status: 'In Progress',
      service: 'Periodic service · Oil change',
    },
    {
      id: 'JOB-023',
      name: 'Pooja Deshmukh',
      initials: 'PD',
      phone: '+91 98221 44556',
      vehicle: 'Maruti Swift VXi',
      vehicleDescription: 'Hatchback',
      registration: 'MH12 CD 2214',
      vehicles: 2,
      status: 'Completed',
      service: 'Brake inspection · Wheel alignment',
    },
    {
      id: 'JOB-022',
      name: 'Arun Kulkarni',
      initials: 'AK',
      phone: '+91 98900 87654',
      vehicle: 'Royal Enfield Classic 350',
      vehicleDescription: 'Cruiser 350cc',
      registration: 'MH14 EF 8702',
      vehicles: 1,
      status: 'Draft',
      service: 'General inspection',
    },
    {
      id: 'JOB-021',
      name: 'Ramesh Kumar',
      initials: 'RK',
      phone: '+91 98450 12384',
      vehicle: 'Hyundai Creta SX',
      vehicleDescription: 'Vehicle 1 of 2',
      registration: 'KA04 MP 3042',
      vehicles: 2,
      status: 'In Progress',
      service: 'AC inspection · Periodic service',
    },
    {
      id: 'JOB-020',
      name: 'Vikram Malhotra',
      initials: 'VM',
      phone: '+91 98201 33211',
      vehicle: 'Tata Nexon EV',
      vehicleDescription: 'Electric SUV',
      registration: 'MH01 EX 9102',
      vehicles: 3,
      status: 'Completed',
      service: 'Tyre rotation · Safety inspection',
    },
  ];
  readonly filteredJobs = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.jobs.filter(
      (job) =>
        (this.statusValue() === 'All statuses' ||
          job.status === this.statusValue()) &&
        [job.name, job.phone, job.vehicle, job.registration, job.id].some(
          (value) => value.toLowerCase().includes(query),
        ),
    );
  });
  readonly reminders = [
    {
      name: 'Amit Trivedi',
      vehicle: 'Honda City · MH01 EX 9102',
      service: '6-month periodic service',
      due: 'Due 2 days ago',
      status: 'Queued',
      icon: 'chat',
      action: 'Send Reminder',
      overdue: true,
    },
    {
      name: 'Priya Sharma',
      vehicle: 'Kia Seltos · KA04 MP 3042',
      service: 'Annual brake fluid inspection',
      due: 'Due today',
      status: 'Ready',
      icon: 'check_circle',
      action: 'Send Reminder',
      overdue: false,
    },
    {
      name: 'Kiran Joshi',
      vehicle: 'Maruti Baleno · MH12 AB 4590',
      service: 'Wheel alignment & balancing',
      due: 'In 3 days',
      status: 'Auto-dispatch',
      icon: '',
      action: 'View',
      overdue: false,
    },
  ];
  preview(action: string): void {
    this.notice.set(
      `${action} is a frontend preview. No record was created, changed, or message sent.`,
    );
  }
  findVehicle(): void {
    this.search.setValue('');
    this.status.setValue('All statuses');
    this.notice.set(
      'Search the sample jobs by customer, vehicle, registration number, or job ID.',
    );
  }
}

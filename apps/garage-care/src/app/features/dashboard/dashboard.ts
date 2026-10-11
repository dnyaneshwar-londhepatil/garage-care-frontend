import { Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardIcon } from './dashboard-icon';
import { DashboardShell } from './dashboard-shell';

interface Job {
  id: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  registration: string;
  vehicles: number;
  status: 'In Progress' | 'Completed' | 'Draft';
  service: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, DashboardIcon, DashboardShell],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly notice = signal('');
  readonly selectedJob = signal<Job | null>(null);
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
    },
    {
      label: 'Invoices',
      value: '12',
      description: 'Created this month',
      detail: '₹1,48,200 billed',
    },
    {
      label: 'Customers',
      value: '146',
      description: 'Registered customers',
      detail: '+14 this month',
    },
    {
      label: 'Upcoming Reminders',
      value: '05',
      description: 'Due soon',
      detail: '2 overdue · 3 this week',
    },
  ];
  readonly actions = [
    { title: 'New Service Job', detail: 'Open intake card' },
    { title: 'Add Customer', detail: 'Phone & GSTIN profile' },
    { title: 'Create Invoice', detail: 'Tax & job line items' },
    {
      title: 'Find Vehicle',
      detail: 'Search registration & history',
    },
  ];
  readonly jobs: Job[] = [
    {
      id: 'JOB-024',
      name: 'Suresh Patil',
      initials: 'SP',
      phone: '+91 98230 11234',
      vehicle: 'Honda Activa 6G',
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
      due: 'Overdue by 2 days',
      overdue: true,
    },
    {
      name: 'Priya Sharma',
      vehicle: 'Kia Seltos · KA04 MP 3042',
      service: 'Annual brake fluid inspection',
      due: 'Due on snapshot date',
      overdue: false,
    },
    {
      name: 'Kiran Joshi',
      vehicle: 'Maruti Baleno · MH12 AB 4590',
      service: 'Wheel alignment & balancing',
      due: 'Due in 3 days',
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

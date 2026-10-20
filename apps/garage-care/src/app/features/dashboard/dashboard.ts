import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AuthApi,
  CustomersApi,
  VehiclesApi,
  ServicesApi,
  RemindersApi,
  DashboardApi,
  InvoicesApi,
  NotificationsApi,
  DashboardSummary,
  Customer,
  Vehicle,
  Reminder,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import {
  DashboardOverview,
  DashboardReminder,
} from './components/dashboard-overview/dashboard-overview';
import { Job } from './dashboard.models';
import { QuickIntake } from '../service-jobs/components/quick-intake/quick-intake';
import { PREVIEW_JOBS } from '../service-jobs/service-jobs.preview';
import { STATUS_LABELS } from '../service-jobs/service-jobs.models';
import { DashboardJobs } from './components/dashboard-jobs/dashboard-jobs';

@Component({
  selector: 'app-dashboard',
  imports: [
    QuickIntake,
    ActionButton,
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
  readonly auth = inject(AuthApi);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  private readonly dashboardApi = inject(DashboardApi);
  private readonly customersApi = inject(CustomersApi);
  private readonly vehiclesApi = inject(VehiclesApi);
  private readonly servicesApi = inject(ServicesApi);
  private readonly remindersApi = inject(RemindersApi);
  private readonly invoicesApi = inject(InvoicesApi);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly intakeOpen = signal(false);
  readonly now = signal<Date | null>(null);
  readonly greeting = computed(() => {
    const date = this.now();
    if (!date) return 'Welcome';
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(date),
    );
    return hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening';
  });
  readonly today = computed(() =>
    this.now()
      ? new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(this.now()!)
      : '',
  );
  readonly firstName = computed(() =>
    this.previewMode
      ? 'Rajesh'
      : this.auth.user()?.fullName?.trim().split(/\s+/)[0] || 'Owner',
  );
  readonly garageLocation = computed(() =>
    this.previewMode ? 'Indiranagar' : this.auth.garage()?.address?.city || '',
  );
  readonly notice = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly jobs = signal<Job[]>([]);
  readonly reminders = signal<DashboardReminder[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly totalJobs = computed(() => {
    const counts = this.summary()?.serviceCounts;
    return counts
      ? counts.draft + counts.inProgress + counts.completed + counts.cancelled
      : 0;
  });
  private readonly invoiceKeys = new Map<string, string>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('All statuses', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, {
    initialValue: '',
  });
  private readonly statusValue = toSignal(this.status.valueChanges, {
    initialValue: 'All statuses',
  });
  readonly ownerName = computed(() =>
    this.previewMode
      ? 'Preview account'
      : this.auth.user()?.fullName || this.auth.user()?.email || 'Owner',
  );
  readonly garageName = computed(() =>
    this.previewMode
      ? 'Apex Auto Garage · Sample'
      : this.auth.garage()?.name || 'Your garage',
  );
  readonly metrics = computed(() => {
    const data = this.summary();
    const money = data
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(data.revenueSummary.issuedInvoiceTotalPaise / 100)
      : '—';
    return [
      {
        label: 'Active Jobs',
        value: data ? String(data.serviceCounts.inProgress) : '—',
        description: 'Currently in progress',
        detail: data
          ? `${data.serviceCounts.draft} draft jobs`
          : 'Loading summary',
        icon: 'car_repair',
      },
      {
        label: 'Invoices',
        value: money,
        description: 'Issued invoice amount · all time',
        detail: 'Collected payments unavailable',
        icon: 'receipt_long',
      },
      {
        label: 'Customers',
        value: data ? String(data.customers) : '—',
        description: 'Registered customers',
        detail: 'Your garage',
        icon: 'group',
      },
      {
        label: 'Upcoming Reminders',
        value: data ? String(data.upcomingReminders) : '—',
        description: 'Pending reminders',
        detail: 'Delivery tracked by the server',
        icon: 'notification_important',
      },
    ];
  });
  readonly actions = [
    { title: 'New Service Job', detail: 'Open intake card', icon: 'add_task' },
    { title: 'Add Customer', detail: 'Customer profile', icon: 'person_add' },
    {
      title: 'Create Invoice',
      detail: 'Complete a service job',
      icon: 'post_add',
    },
    {
      title: 'Find Vehicle',
      detail: 'Search loaded jobs',
      icon: 'search_insights',
    },
  ];
  readonly filteredJobs = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.jobs().filter(
      (job) =>
        (this.statusValue() === 'All statuses' ||
          job.status === this.statusValue()) &&
        [
          job.name,
          job.phone,
          job.vehicle,
          job.registration,
          job.id,
          job.number || '',
          job.service,
        ].some(
          (value) =>
            value.toLowerCase().includes(query) ||
            value
              .toLowerCase()
              .replace(/[\s-]/g, '')
              .includes(query.replace(/[\s-]/g, '')),
        ),
    );
  });
  constructor() {
    if (this.previewMode) this.loadPreview();
    afterNextRender(() => {
      this.now.set(new Date());
      const clock = setInterval(() => this.now.set(new Date()), 60000);
      this.destroyRef.onDestroy(() => clearInterval(clock));
      void this.load();
    });
  }
  private loadPreview(): void {
    this.jobs.set(
      PREVIEW_JOBS.map(({ job, customer, vehicle }) => ({
        id: job._id,
        number: job.serviceNumber,
        name: customer.name,
        initials: customer.name
          .split(' ')
          .map((word) => word[0])
          .slice(0, 2)
          .join(''),
        phone: customer.phone,
        vehicle: vehicle.brand + ' ' + vehicle.model,
        vehicleDescription: vehicle.vehicleType,
        registration: vehicle.registrationNumber,
        vehicles: 1,
        status: STATUS_LABELS[job.status],
        service: job.complaint || '',
        version: job.version,
      })),
    );
    this.summary.set({
      serviceCounts: {
        draft: PREVIEW_JOBS.filter((row) => row.job.status === 'draft').length,
        inProgress: PREVIEW_JOBS.filter(
          (row) => row.job.status === 'in_progress',
        ).length,
        completed: PREVIEW_JOBS.filter((row) => row.job.status === 'completed')
          .length,
        cancelled: PREVIEW_JOBS.filter((row) => row.job.status === 'cancelled')
          .length,
      },
      customers: new Set(PREVIEW_JOBS.map((row) => row.customer._id)).size,
      upcomingReminders: 0,
      recentInvoices: [],
      revenueSummary: { issuedInvoiceTotalPaise: 0, paidTotalPaise: null },
    });
    this.loading.set(false);
  }
  async load(append = false): Promise<void> {
    if (this.previewMode) {
      this.loadPreview();
      return;
    }
    this.loading.set(true);
    this.failed.set(false);
    try {
      if (!this.auth.user()) await this.auth.me();
      const [summary, servicePage, reminderPage] = await Promise.all([
        this.dashboardApi.summary(),
        this.servicesApi.list({
          limit: 100,
          cursor: append ? (this.nextCursor() ?? undefined) : undefined,
        }),
        this.remindersApi.list({ limit: 20, status: 'pending' }),
      ]);
      const customerCache = new Map<string, Promise<Customer>>();
      const vehicleCache = new Map<string, Promise<Vehicle>>();
      const customer = (id: string) => {
        const cached = customerCache.get(id);
        if (cached) return cached;
        const request = this.customersApi.get(id);
        customerCache.set(id, request);
        return request;
      };
      const vehicle = (id: string) => {
        const cached = vehicleCache.get(id);
        if (cached) return cached;
        const request = this.vehiclesApi.get(id);
        vehicleCache.set(id, request);
        return request;
      };
      const jobs = await Promise.all(
        servicePage.data.map(async (record) => {
          const [owner, car] = await Promise.all([
            customer(record.customerId),
            vehicle(record.vehicleId),
          ]);
          const status: Job['status'] =
            record.status === 'in_progress'
              ? 'In Progress'
              : record.status === 'completed'
                ? 'Completed'
                : record.status === 'cancelled'
                  ? 'Cancelled'
                  : 'Draft';
          return {
            id: record._id,
            number: record.serviceNumber,
            name: owner.name,
            initials: owner.name
              .split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join(''),
            phone: owner.phone,
            vehicle: `${car.brand} ${car.model}`,
            vehicleDescription: car.vehicleType,
            registration: car.registrationNumber,
            vehicles: 1,
            status,
            service:
              record.complaint ||
              record.workPerformed ||
              'No description provided',
            version: record.version,
            invoiceId: summary.recentInvoices.find(
              (invoice) => invoice.serviceId === record._id,
            )?._id,
            whatsappConsent: owner.whatsappConsent?.status === 'opted_in',
          } satisfies Job;
        }),
      );
      const reminders = await Promise.all(
        reminderPage.data.map(async (record) => {
          const [owner, car] = await Promise.all([
            customer(record.customerId),
            vehicle(record.vehicleId),
          ]);
          return this.mapReminder(record, owner, car);
        }),
      );
      if (this.destroyRef.destroyed) return;
      this.summary.set(summary);
      this.jobs.set(append ? [...this.jobs(), ...jobs] : jobs);
      this.reminders.set(reminders);
      this.nextCursor.set(servicePage.page.nextCursor);
    } catch (error) {
      this.failed.set(true);
      await this.handleError(error);
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  private mapReminder(
    record: Reminder,
    owner: Customer,
    car: Vehicle,
  ): DashboardReminder {
    return {
      id: record._id,
      name: owner.name,
      vehicle: `${car.brand} ${car.model} · ${car.registrationNumber}`,
      service: 'Upcoming service',
      due: new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
      }).format(new Date(record.dueDate)),
      status: record.status,
      icon: 'chat',
      action: 'View',
      overdue: Date.parse(record.dueDate) < Date.now(),
    };
  }
  async logout(): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Preview account. No session was changed.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      await this.handleError(error);
    } finally {
      this.busy.set(false);
    }
  }
  async viewReminder(id: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const record = await this.remindersApi.get(id);
      this.notice.set(
        `Reminder status: ${record.status}. Scheduled ${new Date(record.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Delivery is managed by the server.`,
      );
    } catch (error) {
      await this.handleError(error);
    } finally {
      this.busy.set(false);
    }
  }
  async jobAction(action: {
    kind: 'history' | 'whatsapp' | 'pdf';
    job: Job;
  }): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Sample preview. No server action was submitted.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (action.kind === 'history') {
        const [record, history] = await Promise.all([
          this.servicesApi.get(action.job.id),
          this.servicesApi.history(action.job.id, { limit: 20 }),
        ]);
        this.notice.set(
          `${record.workPerformed || record.complaint || 'No work description recorded'}. Vehicle history: ${history.data.length} jobs loaded${history.page.nextCursor ? '; more available' : ''}.`,
        );
      } else if (action.kind === 'pdf' && action.job.invoiceId) {
        const invoice = await this.invoicesApi.get(action.job.invoiceId);
        const blob = await this.invoicesApi.pdf(invoice._id);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download =
          invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '-') + '.pdf';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.notice.set('Invoice PDF downloaded.');
      } else {
        if (!action.job.invoiceId || !action.job.whatsappConsent) {
          this.notice.set(
            'Invoice delivery requires an issued invoice and recorded customer WhatsApp consent.',
          );
          return;
        }
        const id = action.job.invoiceId;
        let key = this.invoiceKeys.get(id);
        if (!key) {
          key = crypto.randomUUID();
          this.invoiceKeys.set(id, key);
        }
        const notification = await this.invoicesApi.sendWhatsApp(
          id,
          action.job.phone,
          key,
        );
        const latest = await this.notificationsApi.get(notification._id);
        this.notice.set(
          `Invoice delivery status: ${latest.status}. A queued request does not confirm delivery.`,
        );
      }
    } catch (error) {
      await this.handleError(error);
    } finally {
      this.busy.set(false);
    }
  }
  openJobs(): void {
    void this.router.navigateByUrl(
      this.previewMode ? '/preview/service-jobs' : '/service-jobs',
    );
  }
  preview(action: string): void {
    this.notice.set(
      `${action} page is not implemented yet. No server action was submitted.`,
    );
  }
  findVehicle(): void {
    this.search.setValue('');
    this.status.setValue('All statuses');
    this.notice.set(
      'Search the loaded jobs by customer, vehicle, registration number, or job ID.',
    );
  }
  private async handleError(error: unknown): Promise<void> {
    this.notice.set(apiErrorMessage(error));
    if (error instanceof HttpErrorResponse && error.status === 401)
      await this.router.navigateByUrl('/sign-in');
  }
}

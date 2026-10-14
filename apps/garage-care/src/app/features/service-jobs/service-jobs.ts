import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import {
  AuthApi,
  CustomersApi,
  VehiclesApi,
  ServicesApi,
  DashboardApi,
  DashboardSummary,
  Customer,
  Vehicle,
  ServiceStatus,
  apiErrorMessage,
  ServiceJob,
} from '@garage-care/shared/data-access';
import { csvCell, ServiceRow, STATUS_LABELS } from './service-jobs.models';
import { PREVIEW_JOBS } from './service-jobs.preview';
import { QuickIntake } from './components/quick-intake/quick-intake';

@Component({
  selector: 'app-service-jobs',
  imports: [
    QuickIntake,
    ReactiveFormsModule,
    DatePipe,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './service-jobs.html',
  styleUrl: './service-jobs.scss',
})
export class ServiceJobs {
  readonly auth = inject(AuthApi);
  private readonly services = inject(ServicesApi);
  private readonly customers = inject(CustomersApi);
  private readonly vehicles = inject(VehiclesApi);
  private readonly dashboard = inject(DashboardApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly search = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  private readonly query = toSignal(this.search.valueChanges, {
    initialValue: '',
  });
  readonly rows = signal<ServiceRow[]>(this.previewMode ? PREVIEW_JOBS : []);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(!this.previewMode);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly intakeOpen = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly status = signal<'all' | ServiceStatus>('all');
  readonly category = signal('all');
  readonly dateFilter = signal('all');
  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly selected = signal<Set<string>>(new Set());
  readonly expanded = signal<string | null>(null);
  readonly settingsOpen = signal(false);
  readonly compact = signal(false);
  readonly labels = STATUS_LABELS;
  readonly tabs = [
    { key: 'all', label: 'All Jobs' },
    { key: 'draft', label: 'Draft' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ] as const;
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    const today = this.previewMode
      ? '2026-10-12'
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
    return this.rows().filter(({ job, customer, vehicle }) => {
      const serviceDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(job.serviceDate));
      const age = (Date.parse(today) - Date.parse(serviceDay)) / 86400000;
      return (
        (this.status() === 'all' || job.status === this.status()) &&
        (this.category() === 'all' ||
          vehicle.vehicleType === this.category()) &&
        (this.dateFilter() === 'all' ||
          (this.dateFilter() === 'today' ? age === 0 : age >= 0 && age < 7)) &&
        [
          job._id,
          job.serviceNumber ?? '',
          customer.name,
          customer.phone,
          vehicle.registrationNumber,
          vehicle.brand,
          vehicle.model,
          job.complaint ?? '',
        ].some(
          (value) =>
            value.toLowerCase().includes(query) ||
            value
              .toLowerCase()
              .replace(/[\s-]/g, '')
              .includes(query.replace(/[\s-]/g, '')),
        )
      );
    });
  });
  readonly currentPage = computed(() =>
    Math.min(
      this.page(),
      Math.max(0, Math.ceil(this.filtered().length / this.pageSize()) - 1),
    ),
  );
  readonly visible = computed(() =>
    this.filtered().slice(
      this.currentPage() * this.pageSize(),
      (this.currentPage() + 1) * this.pageSize(),
    ),
  );
  readonly start = computed(() =>
    this.filtered().length ? this.currentPage() * this.pageSize() + 1 : 0,
  );
  readonly end = computed(() =>
    Math.min(
      (this.currentPage() + 1) * this.pageSize(),
      this.filtered().length,
    ),
  );
  readonly allSelected = computed(
    () =>
      this.visible().length > 0 &&
      this.visible().every((row) => this.selected().has(row.job._id)),
  );
  readonly someSelected = computed(
    () =>
      !this.allSelected() &&
      this.visible().some((row) => this.selected().has(row.job._id)),
  );
  readonly metrics = computed(() => [
    {
      label: 'In Progress',
      value: this.count('in_progress'),
      icon: 'car_repair',
    },
    { label: 'Draft Jobs', value: this.count('draft'), icon: 'receipt_long' },
    {
      label: 'Completed',
      value: this.count('completed'),
      icon: 'check_circle',
    },
    { label: 'Total Jobs', value: this.count('all'), icon: 'garage' },
  ]);
  constructor() {
    afterNextRender(() => {
      this.search.enable();
      if (!this.previewMode) void this.load();
    });
  }
  count(status: 'all' | ServiceStatus): number | string {
    const counts = this.summary()?.serviceCounts;
    if (!this.previewMode && !counts) return '—';
    if (counts) {
      if (status === 'all')
        return (
          counts.draft + counts.inProgress + counts.completed + counts.cancelled
        );
      return counts[status === 'in_progress' ? 'inProgress' : status];
    }
    return this.rows().filter(
      (row) => status === 'all' || row.job.status === status,
    ).length;
  }
  async load(append = false): Promise<void> {
    if (this.previewMode) {
      this.notice.set(
        'Sample preview refreshed. No server requests were made.',
      );
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [page, summary] = await Promise.all([
        this.services.list({
          limit: 100,
          cursor: append ? (this.nextCursor() ?? undefined) : undefined,
        }),
        this.dashboard.summary(),
      ]);
      const customerCache = new Map<string, Promise<Customer>>();
      const vehicleCache = new Map<string, Promise<Vehicle>>();
      const rows = await Promise.all(
        page.data.map(async (job) => {
          const customerRequest =
            customerCache.get(job.customerId) ??
            this.customers.get(job.customerId);
          const vehicleRequest =
            vehicleCache.get(job.vehicleId) ?? this.vehicles.get(job.vehicleId);
          customerCache.set(job.customerId, customerRequest);
          vehicleCache.set(job.vehicleId, vehicleRequest);
          const [customer, vehicle] = await Promise.all([
            customerRequest,
            vehicleRequest,
          ]);
          return { job, customer, vehicle };
        }),
      );
      if (this.destroyRef.destroyed) return;
      this.rows.set(append ? [...this.rows(), ...rows] : rows);
      this.summary.set(summary);
      this.nextCursor.set(page.page.nextCursor);
      if (!append) {
        this.page.set(0);
        this.selected.set(new Set());
        this.expanded.set(null);
      }
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      this.error.set(apiErrorMessage(error));
      if (error instanceof HttpErrorResponse && error.status === 401)
        await this.router.navigateByUrl('/sign-in');
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  setStatus(status: 'all' | ServiceStatus): void {
    this.status.set(status);
    this.page.set(0);
  }
  clearSelection(): void {
    this.selected.set(new Set());
  }
  toggle(id: string): void {
    const selected = new Set(this.selected());
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    this.selected.set(selected);
  }
  togglePage(): void {
    const selected = new Set(this.selected());
    const remove = this.allSelected();
    this.visible().forEach((row) => {
      if (remove) selected.delete(row.job._id);
      else selected.add(row.job._id);
    });
    this.selected.set(selected);
  }
  resetFilters(): void {
    this.search.setValue('');
    this.status.set('all');
    this.category.set('all');
    this.dateFilter.set('all');
    this.page.set(0);
  }
  async intakeCreated(job: ServiceJob): Promise<void> {
    this.intakeOpen.set(false);
    this.notice.set(
      `Service job ${job.serviceNumber || job._id} saved${job.status === 'in_progress' ? ' and started' : ' as draft'}.`,
    );
    await this.load();
  }
  preview(action: string): void {
    this.notice.set(
      `${action} is not available on this screen yet. No server action was submitted.`,
    );
  }
  exportCsv(): void {
    const chosen = this.filtered().filter(
      (row) => !this.selected().size || this.selected().has(row.job._id),
    );
    if (!chosen.length) {
      this.notice.set(
        'No matching selected jobs to export. Clear the selection to export all filtered jobs.',
      );
      return;
    }
    const lines = [
      [
        'Job ID',
        'Customer',
        'Phone',
        'Registration',
        'Vehicle',
        'Complaint',
        'Status',
        'Service date',
      ],
      ...chosen.map(({ job, customer, vehicle }) => [
        job.serviceNumber || job._id,
        customer.name,
        customer.phone,
        vehicle.registrationNumber,
        `${vehicle.brand} ${vehicle.model}`,
        job.complaint ?? '',
        this.labels[job.status],
        job.serviceDate,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        [
          '\uFEFF' +
            lines.map((row) => row.map(csvCell).join(',')).join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = this.previewMode
      ? 'sample-service-jobs.csv'
      : 'service-jobs.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.notice.set(
      `Exported ${chosen.length} ${this.previewMode ? 'sample ' : ''}jobs from the filtered, loaded records.`,
    );
  }
  async logout(): Promise<void> {
    if (this.previewMode) {
      this.notice.set(
        'This is a sample preview; no account is signed in here.',
      );
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}

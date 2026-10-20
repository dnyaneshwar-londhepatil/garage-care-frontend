import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import { DatePipe } from '@angular/common';
import {
  AuthApi,
  RemindersApi,
  VehiclesApi,
  CustomersApi,
  Reminder,
  Vehicle,
  Customer,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
import { PREVIEW_JOBS } from '../service-jobs/service-jobs.preview';
export function reminderDate(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(day + 'T00:00:00+05:30');
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed) === day
    ? parsed.toISOString()
    : null;
}
@Component({
  selector: 'app-reminders',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './reminders.html',
  styleUrl: './reminders.scss',
})
export class Reminders {
  readonly auth = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly search = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly cursor = signal<string | null>(null);
  readonly query = signal('');
  constructor() {
    afterNextRender(() => {
      this.ready.set(true);
      void this.load();
    });
  }
  private async report(error: unknown): Promise<void> {
    this.error.set(apiErrorMessage(error));
    if (error instanceof HttpErrorResponse && error.status === 401)
      await this.router.navigateByUrl('/sign-in');
  }
  async logout(): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Preview only. No session was changed.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }

  private readonly api = inject(RemindersApi);
  private readonly vehicles = inject(VehiclesApi);
  private readonly customers = inject(CustomersApi);
  readonly records = signal<Reminder[]>([]);
  readonly vehicleMap = signal(new Map<string, Vehicle>());
  readonly customerMap = signal(new Map<string, Customer>());
  readonly choices = signal<Vehicle[]>([]);
  readonly selectedVehicle = signal<Vehicle | null>(null);
  readonly choosing = signal(false);
  readonly choiceError = signal('');
  readonly choiceCursor = signal<string | null>(null);
  readonly choiceQuery = signal('');
  readonly vehicleSearch = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly editorOpen = signal(false);
  readonly formError = signal('');
  readonly cancelTarget = signal<Reminder | null>(null);
  readonly status = signal('');
  readonly statuses = [
    'pending',
    'processing',
    'submitted',
    'sent',
    'delivered',
    'failed',
    'cancelled',
  ];
  readonly form = new FormGroup({
    vehicleId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dueDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  private samples: Reminder[] = [
    {
      _id: 'sample-r1',
      customerId: PREVIEW_JOBS[0].customer._id,
      vehicleId: PREVIEW_JOBS[0].vehicle._id,
      dueDate: '2026-11-20T18:30:00Z',
      scheduledAt: '2026-11-13T18:30:00Z',
      status: 'pending',
    },
  ];
  invalid(key: keyof typeof this.form.controls): boolean {
    return this.form.controls[key].invalid && this.form.controls[key].touched;
  }
  async hydrateVehicles(vehicles: Vehicle[]): Promise<void> {
    const customerMap = new Map(this.customerMap());
    await Promise.all(
      [...new Set(vehicles.map((vehicle) => vehicle.customerId))].map(
        async (id) => {
          if (!customerMap.has(id))
            customerMap.set(
              id,
              this.previewMode
                ? PREVIEW_JOBS.find((row) => row.customer._id === id)
                    ?.customer || {
                    _id: id,
                    name: 'Sample customer',
                    phone: '',
                  }
                : await this.customers.get(id),
            );
        },
      ),
    );
    if (this.destroyRef.destroyed) return;
    this.customerMap.set(customerMap);
    this.vehicleMap.update(
      (map) =>
        new Map([
          ...map,
          ...vehicles.map((vehicle) => [vehicle._id, vehicle] as const),
        ]),
    );
  }
  async load(append = false): Promise<void> {
    if (this.loading() || this.busy()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      const page = this.previewMode
        ? {
            data: this.samples.filter(
              (row) => !this.status() || row.status === this.status(),
            ),
            page: { nextCursor: null },
          }
        : await this.api.list({
            limit: 20,
            status: this.status() || undefined,
            cursor: append ? this.cursor() || undefined : undefined,
          });
      const ids = [...new Set(page.data.map((row) => row.vehicleId))];
      const vehicles = this.previewMode
        ? PREVIEW_JOBS.filter((row) => ids.includes(row.vehicle._id)).map(
            (row) => row.vehicle,
          )
        : await Promise.all(ids.map((id) => this.vehicles.get(id)));
      await this.hydrateVehicles(vehicles);
      if (this.destroyRef.destroyed) return;
      this.records.set(
        append
          ? [
              ...new Map(
                [...this.records(), ...page.data].map((row) => [row._id, row]),
              ).values(),
            ]
          : page.data,
      );
      this.cursor.set(page.page.nextCursor);
    } catch (error) {
      if (!this.destroyRef.destroyed) await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  async findVehicles(append = false): Promise<void> {
    if (this.choosing() || this.busy() || this.vehicleSearch.invalid) return;
    if (!append) {
      this.choiceQuery.set(this.vehicleSearch.value.trim());
      this.choose('');
    }
    this.choiceError.set('');
    this.choosing.set(true);
    try {
      const page = this.previewMode
        ? {
            data: PREVIEW_JOBS.map((row) => row.vehicle).filter((vehicle) =>
              [vehicle.registrationNumber, vehicle.brand, vehicle.model].some(
                (value) =>
                  value
                    .toLowerCase()
                    .includes(this.choiceQuery().toLowerCase()),
              ),
            ),
            page: { nextCursor: null },
          }
        : await this.vehicles.list({
            limit: 20,
            q: this.choiceQuery() || undefined,
            cursor: append ? this.choiceCursor() || undefined : undefined,
          });
      await this.hydrateVehicles(page.data);
      if (this.destroyRef.destroyed) return;
      this.choices.set(
        append
          ? [
              ...new Map(
                [...this.choices(), ...page.data].map((row) => [row._id, row]),
              ).values(),
            ]
          : page.data,
      );
      this.choiceCursor.set(page.page.nextCursor);
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.choiceError.set(apiErrorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 401)
          await this.router.navigateByUrl('/sign-in');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.choosing.set(false);
    }
  }
  choose(id: string): void {
    const vehicle = this.choices().find((row) => row._id === id) || null;
    this.selectedVehicle.set(vehicle);
    this.form.controls.vehicleId.setValue(vehicle?._id || '');
  }
  async open(): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.form.reset();
    this.formError.set('');
    this.vehicleSearch.setValue('');
    this.choices.set([]);
    this.choiceCursor.set(null);
    this.editorOpen.set(true);
    await this.findVehicles();
    if (!this.destroyRef.destroyed)
      document.getElementById('reminder-due')?.focus();
  }
  async save(): Promise<void> {
    if (this.busy() || this.choosing()) return;
    this.form.markAllAsTouched();
    this.formError.set('');
    const vehicle = this.selectedVehicle();
    const dueDate = reminderDate(this.form.controls.dueDate.value);
    if (this.form.invalid || !vehicle || !dueDate) {
      this.formError.set('Choose a vehicle and a valid service due date.');
      return;
    }
    this.busy.set(true);
    try {
      const payload = {
        customerId: vehicle.customerId,
        vehicleId: vehicle._id,
        dueDate,
      };
      const existing = this.previewMode
        ? this.samples.find(
            (row) =>
              row.vehicleId === vehicle._id &&
              Date.parse(row.dueDate) === Date.parse(dueDate),
          )
        : undefined;
      const saved: Reminder =
        existing ||
        (this.previewMode
          ? {
              ...payload,
              _id: 'sample-' + crypto.randomUUID(),
              scheduledAt: new Date(
                Date.parse(dueDate) - 7 * 86400000,
              ).toISOString(),
              status: 'pending',
            }
          : await this.api.create(payload));
      if (this.destroyRef.destroyed) return;
      if (this.previewMode && !existing)
        this.samples = [
          ...this.samples.map((row) =>
            row.vehicleId === vehicle._id && row.status === 'pending'
              ? { ...row, status: 'cancelled' }
              : row,
          ),
          saved,
        ];
      this.editorOpen.set(false);
      this.notice.set(
        this.previewMode
          ? 'Sample reminder status: ' + saved.status + '. No message was sent.'
          : 'Reminder status: ' +
              saved.status +
              '. Scheduling does not confirm delivery.',
      );
    } catch (error) {
      this.formError.set(apiErrorMessage(error));
      if (error instanceof HttpErrorResponse && error.status === 401)
        await this.router.navigateByUrl('/sign-in');
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (!this.editorOpen() && !this.destroyRef.destroyed) await this.load();
  }
  async cancel(): Promise<void> {
    const target = this.cancelTarget();
    if (
      !target ||
      this.busy() ||
      !['pending', 'failed'].includes(target.status)
    )
      return;
    this.busy.set(true);
    try {
      const saved = this.previewMode
        ? { ...target, status: 'cancelled' }
        : await this.api.update(target._id, { status: 'cancelled' });
      if (this.destroyRef.destroyed) return;
      if (this.previewMode)
        this.samples = this.samples.map((row) =>
          row._id === saved._id ? saved : row,
        );
      this.cancelTarget.set(null);
      this.notice.set(
        this.previewMode
          ? 'Sample reminder cancelled locally.'
          : 'Reminder status: ' + saved.status + '.',
      );
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (!this.cancelTarget() && !this.destroyRef.destroyed) await this.load();
  }
}

import {
  afterNextRender,
  Component,
  computed,
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
  AuthApi,
  Customer,
  CustomersApi,
  Vehicle,
  VehicleInput,
  VehiclesApi,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import { PREVIEW_JOBS } from '../service-jobs/service-jobs.preview';

const text = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(200),
    ],
  });
export const registrationNumber = (value: string) =>
  value.replace(/[\s-]/g, '').toUpperCase();
@Component({
  selector: 'app-vehicles',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.scss',
})
export class Vehicles {
  readonly auth = inject(AuthApi);
  private readonly api = inject(VehiclesApi);
  private readonly customers = inject(CustomersApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly ready = signal(false);
  readonly search = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly customerSearch = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly query = signal('');
  readonly customerQuery = signal('');
  readonly records = signal<Vehicle[]>(
    this.previewMode ? PREVIEW_JOBS.map((row) => row.vehicle) : [],
  );
  readonly owners = signal(
    new Map<string, Customer>(
      this.previewMode
        ? PREVIEW_JOBS.map((row) => [row.customer._id, row.customer] as const)
        : [],
    ),
  );
  readonly rows = computed(() =>
    this.previewMode
      ? this.records().filter((vehicle) =>
          [vehicle.registrationNumber, vehicle.brand, vehicle.model].some(
            (value) =>
              registrationNumber(value).includes(
                registrationNumber(this.query()),
              ),
          ),
        )
      : this.records(),
  );
  readonly choices = signal<Customer[]>([]);
  readonly selectedOwner = signal<Customer | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly choosing = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly customerError = signal('');
  readonly notice = signal('');
  readonly cursor = signal<string | null>(null);
  readonly customerCursor = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<Vehicle | null>(null);
  readonly types = [
    { value: 'car', label: 'Car' },
    { value: 'bike', label: 'Bike' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'other', label: 'Other' },
  ] as const;
  readonly form = new FormGroup({
    customerId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    registrationNumber: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9\s-]{4,20}$/),
      ],
    }),
    vehicleType: new FormControl<VehicleInput['vehicleType']>('car', {
      nonNullable: true,
    }),
    brand: text(),
    model: text(),
    fuelType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
    currentKm: new FormControl<number | null>(null, {
      validators: [
        Validators.min(0),
        Validators.max(10000000),
        Validators.pattern(/^\d+$/),
      ],
    }),
  });
  constructor() {
    afterNextRender(() => {
      this.ready.set(true);
      if (!this.previewMode) void this.load();
    });
  }
  invalid(field: keyof typeof this.form.controls): boolean {
    return (
      this.form.controls[field].invalid && this.form.controls[field].touched
    );
  }
  async load(append = false): Promise<void> {
    if (this.loading() || this.busy()) return;
    if (this.search.invalid) return;
    if (!append) this.query.set(this.search.value.trim());
    this.error.set('');
    if (this.previewMode) return;
    this.loading.set(true);
    try {
      const page = await this.api.list({
        limit: 20,
        q: this.query() || undefined,
        cursor: append ? this.cursor() || undefined : undefined,
      });
      const ownerMap = new Map(this.owners());
      await Promise.all(
        [...new Set(page.data.map((vehicle) => vehicle.customerId))].map(
          async (id) => {
            ownerMap.set(id, await this.customers.get(id));
          },
        ),
      );
      if (this.destroyRef.destroyed) return;
      this.owners.set(ownerMap);
      this.records.set(
        append
          ? [
              ...new Map(
                [...this.records(), ...page.data].map((vehicle) => [
                  vehicle._id,
                  vehicle,
                ]),
              ).values(),
            ]
          : page.data,
      );
      this.cursor.set(page.page.nextCursor);
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.error.set(apiErrorMessage(error));
        await this.expired(error);
      }
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  async findCustomers(append = false): Promise<void> {
    if (this.choosing() || this.busy() || this.editing()) return;
    if (this.customerSearch.invalid) return;
    if (!append) {
      this.customerQuery.set(this.customerSearch.value.trim());
      this.selectOwner('');
    }
    this.customerError.set('');
    this.choosing.set(true);
    try {
      const page = this.previewMode
        ? {
            data: [...this.owners().values()].filter((customer) =>
              [customer.name, customer.phone, customer.email || ''].some(
                (value) =>
                  value
                    .toLowerCase()
                    .includes(this.customerQuery().toLowerCase()),
              ),
            ),
            page: { nextCursor: null },
          }
        : await this.customers.list({
            limit: 20,
            q: this.customerQuery() || undefined,
            cursor: append ? this.customerCursor() || undefined : undefined,
          });
      if (this.destroyRef.destroyed) return;
      this.choices.set(
        append
          ? [
              ...new Map(
                [...this.choices(), ...page.data].map((customer) => [
                  customer._id,
                  customer,
                ]),
              ).values(),
            ]
          : page.data,
      );
      this.customerCursor.set(page.page.nextCursor);
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.customerError.set(apiErrorMessage(error));
        await this.expired(error);
      }
    } finally {
      if (!this.destroyRef.destroyed) this.choosing.set(false);
    }
  }
  selectOwner(id: string): void {
    if (this.editing()) return;
    const owner =
      this.choices().find((customer) => customer._id === id) || null;
    this.selectedOwner.set(owner);
    this.form.controls.customerId.setValue(owner?._id || '');
  }
  async open(vehicle?: Vehicle): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.error.set('');
    this.formError.set('');
    this.notice.set('');
    this.customerError.set('');
    this.busy.set(true);
    try {
      const record = vehicle
        ? this.previewMode
          ? vehicle
          : await this.api.get(vehicle._id)
        : null;
      const owner = record
        ? this.previewMode
          ? this.owners().get(record.customerId) || null
          : await this.customers.get(record.customerId)
        : null;
      if (this.destroyRef.destroyed) return;
      this.editing.set(record);
      this.selectedOwner.set(owner);
      this.customerSearch.setValue('');
      this.customerQuery.set('');
      this.choices.set([]);
      this.customerCursor.set(null);
      this.form.reset({
        customerId: record?.customerId || '',
        registrationNumber: record?.registrationNumber || '',
        vehicleType: record?.vehicleType || 'car',
        brand: record?.brand || '',
        model: record?.model || '',
        fuelType: record?.fuelType || '',
        currentKm: record?.currentKm ?? null,
      });
      this.editorOpen.set(true);
      setTimeout(() => {
        if (!this.destroyRef.destroyed)
          document.getElementById('vehicle-registration')?.focus();
      });
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.error.set(apiErrorMessage(error));
        await this.expired(error);
      }
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (this.editorOpen() && !this.editing() && !this.destroyRef.destroyed)
      await this.findCustomers();
  }
  close(): void {
    if (this.busy() || this.choosing()) return;
    this.editorOpen.set(false);
    this.editing.set(null);
    this.formError.set('');
    document.getElementById('add-vehicle')?.focus();
  }
  async save(): Promise<void> {
    if (this.busy() || this.choosing()) return;
    this.form.markAllAsTouched();
    this.formError.set('');
    const value = this.form.getRawValue();
    const plate = registrationNumber(value.registrationNumber);
    if (this.form.invalid || plate.length < 4 || !this.selectedOwner()) {
      this.formError.set('Check the highlighted fields and select a customer.');
      return;
    }
    const current = this.editing();
    if (
      (current?.fuelType && !value.fuelType.trim()) ||
      (current?.currentKm !== undefined && value.currentKm === null)
    ) {
      this.formError.set(
        'Keep or replace the saved fuel type and odometer. These values cannot be removed by the current API.',
      );
      return;
    }
    const details: Omit<VehicleInput, 'customerId'> = {
      registrationNumber: plate,
      vehicleType: value.vehicleType,
      brand: value.brand.trim(),
      model: value.model.trim(),
      ...(value.fuelType.trim() ? { fuelType: value.fuelType.trim() } : {}),
      ...(value.currentKm !== null ? { currentKm: value.currentKm } : {}),
    };
    this.busy.set(true);
    try {
      const saved: Vehicle = this.previewMode
        ? {
            ...current,
            ...details,
            customerId: current?.customerId || value.customerId,
            _id: current?._id || 'preview-' + crypto.randomUUID(),
          }
        : current
          ? await this.api.update(current._id, details)
          : await this.api.create({ ...details, customerId: value.customerId });
      if (this.destroyRef.destroyed) return;
      if (this.previewMode)
        this.records.update((rows) =>
          current
            ? rows.map((row) => (row._id === saved._id ? saved : row))
            : [saved, ...rows],
        );
      const owner = this.selectedOwner();
      if (owner)
        this.owners.update((owners) => new Map(owners).set(owner._id, owner));
      this.editorOpen.set(false);
      this.editing.set(null);
      this.notice.set(
        this.previewMode
          ? 'Sample vehicle saved for this preview only. No server record was changed.'
          : 'Vehicle saved.',
      );
      document.getElementById('add-vehicle')?.focus();
    } catch (error) {
      if (!this.destroyRef.destroyed) {
        this.formError.set(apiErrorMessage(error));
        await this.expired(error);
      }
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (!this.previewMode && !this.destroyRef.destroyed && !this.editorOpen())
      await this.load();
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
      this.error.set(apiErrorMessage(error));
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  private async expired(error: unknown): Promise<void> {
    if (error instanceof HttpErrorResponse && error.status === 401)
      await this.router.navigateByUrl('/sign-in');
  }
}

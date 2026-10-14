import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import {
  AuthApi,
  CustomersApi,
  VehiclesApi,
  PartsApi,
  ServicesApi,
  Customer,
  Vehicle,
  Part,
  ServiceJob,
  ServiceLine,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
import { PREVIEW_JOBS } from '../service-jobs.preview';

const text = (required = false, max = 100) =>
  new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.maxLength(max),
      ...(required ? [Validators.required, Validators.pattern(/\S/)] : []),
    ],
  });
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const dateToIso = (day: string) =>
  new Date(`${day}T00:00:00+05:30`).toISOString();
export const moneyToPaise = (value: string): number => {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ''] = value.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return paise <= 1000000000 ? paise : NaN;
};

@Component({
  selector: 'app-new-service-job',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './new-service-job.html',
  styleUrl: './new-service-job.scss',
})
export class NewServiceJob {
  readonly auth = inject(AuthApi);
  private readonly customersApi = inject(CustomersApi);
  private readonly vehiclesApi = inject(VehiclesApi);
  private readonly partsApi = inject(PartsApi);
  private readonly servicesApi = inject(ServicesApi);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly search = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  readonly customerChoice = new FormControl('', { nonNullable: true });
  readonly vehicleChoice = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  readonly customers = signal<Customer[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly parts = signal<Part[]>([]);
  readonly customer = signal<Customer | null>(null);
  readonly vehicle = signal<Vehicle | null>(null);
  readonly items = signal<ServiceLine[]>([]);
  readonly saved = signal<ServiceJob | null>(null);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly vehicleLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly customerQuery = text(false, 100);
  readonly customerCursor = signal<string | null>(null);
  readonly partCursor = signal<string | null>(null);
  readonly customerEditor = signal(false);
  readonly vehicleEditor = signal(false);
  readonly lineEditor = signal<'part' | 'labour' | null>(null);
  private customerRequest = 0;
  private vehicleRequest = 0;
  readonly form = new FormGroup({
    serviceDate: text(true),
    odometerKm: text(),
    complaint: text(false, 2000),
    workPerformed: text(false, 4000),
    nextServiceDueDate: text(),
  });
  readonly customerForm = new FormGroup({
    name: text(true),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(254)],
    }),
  });
  readonly vehicleForm = new FormGroup({
    registrationNumber: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9 -]{4,20}$/),
      ],
    }),
    vehicleType: new FormControl<'bike' | 'scooter' | 'car' | 'other'>('car', {
      nonNullable: true,
    }),
    brand: text(true),
    model: text(true),
  });
  readonly lineForm = new FormGroup({
    partId: text(),
    description: text(true),
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(1000),
        Validators.pattern(/^\d+$/),
      ],
    }),
    price: text(true),
    discount: text(),
  });
  readonly partsSubtotal = computed(() => this.subtotal('part'));
  readonly labourSubtotal = computed(() => this.subtotal('labour'));
  readonly total = computed(() => this.partsSubtotal() + this.labourSubtotal());
  readonly backLink = computed(() =>
    this.previewMode ? '/preview/service-jobs' : '/service-jobs',
  );
  constructor() {
    this.form.disable();
    afterNextRender(() => {
      this.form.enable();
      this.form.controls.serviceDate.setValue(today());
      if (this.previewMode) {
        this.customers.set(PREVIEW_JOBS.map((row) => row.customer));
        this.parts.set([
          {
            _id: 'sample-oil',
            name: 'Synthetic engine oil',
            category: 'Oil',
            mrpPaise: 245000,
          },
        ]);
      } else void this.load();
    });
  }
  async load(): Promise<void> {
    if (this.busy() || this.previewMode) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await Promise.all([this.findCustomers(), this.loadParts()]);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  async findCustomers(more = false): Promise<void> {
    const request = ++this.customerRequest;
    try {
      const result = await this.customersApi.list({
        limit: 100,
        q: this.customerQuery.value.trim(),
        ...(more && this.customerCursor()
          ? { cursor: this.customerCursor() ?? undefined }
          : {}),
      });
      if (request !== this.customerRequest) return;
      this.customers.set(
        more ? [...this.customers(), ...result.data] : result.data,
      );
      this.customerCursor.set(result.page.nextCursor);
    } catch (error) {
      if (request === this.customerRequest)
        this.error.set(apiErrorMessage(error));
    }
  }
  async loadParts(more = false): Promise<void> {
    const result = await this.partsApi.list({
      limit: 100,
      ...(more && this.partCursor()
        ? { cursor: this.partCursor() ?? undefined }
        : {}),
    });
    this.parts.set(more ? [...this.parts(), ...result.data] : result.data);
    this.partCursor.set(result.page.nextCursor);
  }
  async moreParts(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.loadParts(true);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
  async chooseCustomer(id: string): Promise<void> {
    this.vehicleLoading.set(false);
    this.customerChoice.setValue(id, { emitEvent: false });
    this.vehicleChoice.setValue('', { emitEvent: false });
    this.vehicleChoice.disable({ emitEvent: false });
    const request = ++this.vehicleRequest;
    this.customer.set(this.customers().find((row) => row._id === id) ?? null);
    this.vehicle.set(null);
    this.vehicles.set([]);
    this.form.controls.odometerKm.setValue('');
    if (!id) return;
    if (this.previewMode) {
      this.vehicleChoice.enable({ emitEvent: false });
      this.vehicles.set(
        PREVIEW_JOBS.filter((row) => row.customer._id === id).map(
          (row) => row.vehicle,
        ),
      );
      return;
    }
    this.vehicleLoading.set(true);
    this.error.set('');
    try {
      const rows: Vehicle[] = [];
      let cursor: string | null = null;
      do {
        const page = await this.vehiclesApi.list({
          customerId: id,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        if (request !== this.vehicleRequest) return;
        rows.push(...page.data);
        cursor = page.page.nextCursor;
      } while (cursor);
      this.vehicles.set(rows);
      this.vehicleChoice.enable({ emitEvent: false });
    } catch (error) {
      if (request === this.vehicleRequest)
        this.error.set(apiErrorMessage(error));
    } finally {
      if (request === this.vehicleRequest) this.vehicleLoading.set(false);
    }
  }
  chooseVehicle(id: string): void {
    this.vehicleChoice.setValue(id, { emitEvent: false });
    const vehicle = this.vehicles().find((row) => row._id === id) ?? null;
    this.vehicle.set(vehicle);
    this.form.controls.odometerKm.setValue(
      vehicle?.currentKm?.toString() ?? '',
    );
  }
  async addCustomer(): Promise<void> {
    this.customerForm.markAllAsTouched();
    if (this.customerForm.invalid || this.busy()) return;
    if (this.previewMode) {
      this.notice.set('Preview only. No customer was created.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const value = this.customerForm.getRawValue();
      const customer = await this.customersApi.create({
        name: value.name.trim(),
        phone: `+91${value.phone}`,
        ...(value.email ? { email: value.email.trim() } : {}),
      });
      this.customers.update((rows) => [customer, ...rows]);
      await this.chooseCustomer(customer._id);
      this.customerEditor.set(false);
      this.customerForm.reset();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
  async addVehicle(): Promise<void> {
    this.vehicleForm.markAllAsTouched();
    const customer = this.customer();
    if (!customer || this.vehicleForm.invalid || this.busy()) return;
    if (this.previewMode) {
      this.notice.set('Preview only. No vehicle was created.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const value = this.vehicleForm.getRawValue();
      const vehicle = await this.vehiclesApi.create({
        ...value,
        brand: value.brand.trim(),
        model: value.model.trim(),
        customerId: customer._id,
        registrationNumber: value.registrationNumber
          .replace(/[ -]/g, '')
          .toUpperCase(),
      });
      this.vehicles.update((rows) => [vehicle, ...rows]);
      this.chooseVehicle(vehicle._id);
      this.vehicleEditor.set(false);
      this.vehicleForm.reset();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
  openLine(kind: 'part' | 'labour'): void {
    this.lineForm.reset({
      partId: '',
      description: '',
      quantity: 1,
      price: '',
      discount: '0',
    });
    this.lineEditor.set(kind);
  }
  choosePart(id: string): void {
    const part = this.parts().find((row) => row._id === id);
    this.lineForm.patchValue({
      partId: id,
      description: part?.name ?? '',
      price: part ? (part.mrpPaise / 100).toFixed(2) : '',
    });
  }
  addLine(): void {
    this.lineForm.markAllAsTouched();
    const value = this.lineForm.getRawValue();
    const kind = this.lineEditor();
    const price = moneyToPaise(value.price);
    const discount = moneyToPaise(value.discount || '0');
    if (
      !kind ||
      this.lineForm.invalid ||
      !Number.isFinite(price) ||
      !Number.isFinite(discount) ||
      discount > price ||
      (kind === 'part' &&
        !this.parts().some((part) => part._id === value.partId))
    ) {
      this.notice.set(
        'Check description, whole quantity, price, and discount. Discounts cannot exceed the unit price.',
      );
      return;
    }
    if (this.items().length >= 100) {
      this.notice.set('A job can contain up to 100 line items.');
      return;
    }
    this.items.update((rows) => [
      ...rows,
      {
        kind,
        description: value.description.trim(),
        quantity: value.quantity,
        mrpPaise: price,
        discountPerUnitPaise: discount,
        taxCategory: 'non_gst',
        ...(kind === 'part' ? { partId: value.partId } : {}),
      },
    ]);
    this.lineEditor.set(null);
    this.notice.set('');
  }
  removeLine(index: number): void {
    this.items.update((rows) => rows.filter((_, i) => i !== index));
  }
  subtotal(kind: 'part' | 'labour'): number {
    return this.items()
      .filter((row) => row.kind === kind)
      .reduce(
        (sum, row) =>
          sum + (row.mrpPaise - (row.discountPerUnitPaise ?? 0)) * row.quantity,
        0,
      );
  }
  async save(action: 'draft' | 'start' | 'print'): Promise<void> {
    if (this.busy() || this.loading() || this.vehicleLoading()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    this.notice.set('');
    const value = this.form.getRawValue();
    const customer = this.customer();
    const vehicle = this.vehicle();
    if (
      this.form.invalid ||
      !customer ||
      !vehicle ||
      vehicle.customerId !== customer._id
    ) {
      this.error.set(
        'Select a customer and their vehicle, and complete the required fields.',
      );
      return;
    }
    const km = value.odometerKm ? Number(value.odometerKm) : undefined;
    if (
      km !== undefined &&
      (!Number.isInteger(km) || km < 0 || km > 10000000)
    ) {
      this.error.set(
        'Odometer must be a whole number between 0 and 10,000,000 km.',
      );
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value.serviceDate) ||
      (value.nextServiceDueDate && value.nextServiceDueDate < value.serviceDate)
    ) {
      this.error.set(
        'Choose a valid service date and a next due date on or after it.',
      );
      return;
    }
    if (this.previewMode) {
      this.notice.set('Preview only. No job, invoice, or message was created.');
      return;
    }
    this.busy.set(true);
    try {
      let job = this.saved();
      if (!job) {
        job = await this.servicesApi.create({
          customerId: customer._id,
          vehicleId: vehicle._id,
          serviceDate: dateToIso(value.serviceDate),
          ...(km !== undefined ? { odometerKm: km } : {}),
          complaint: value.complaint.trim(),
          workPerformed: value.workPerformed.trim(),
          items: this.items(),
          ...(value.nextServiceDueDate
            ? { nextServiceDueDate: dateToIso(value.nextServiceDueDate) }
            : {}),
        });
        this.saved.set(job);
        this.items.set(job.items ?? []);
        this.form.disable();
      }
      if (action === 'start' && job.status === 'draft') {
        job = await this.servicesApi.update(job._id, {
          version: job.version,
          status: 'in_progress',
        });
        this.saved.set(job);
      }
      this.notice.set(
        `Job ${job.serviceNumber || job._id} saved${job.status === 'in_progress' ? ' and started' : ' as draft'}.`,
      );
      if (action === 'print') window.print();
    } catch (error) {
      this.error.set(
        `${this.saved() ? 'The draft is saved. Starting work failed; retry Start work without creating another job. ' : ''}${apiErrorMessage(error)}`,
      );
    } finally {
      this.busy.set(false);
    }
  }
  async logout(): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Preview account. No session to sign out.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.logout();
      window.location.assign('/sign-in');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}

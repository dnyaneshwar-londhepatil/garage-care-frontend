import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActionButton, DashboardIcon } from '@garage-care/shared/ui';
import {
  CustomersApi,
  VehiclesApi,
  ServicesApi,
  Customer,
  Vehicle,
  ServiceJob,
  Page,
  apiErrorMessage,
} from '@garage-care/shared/data-access';

const requiredText = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(200),
    ],
  });
export const normalizePlate = (value: string) =>
  value.replace(/[\s-]/g, '').toUpperCase();
export const intakeDate = (day: string) =>
  new Date(`${day}T00:00:00+05:30`).toISOString();

@Component({
  selector: 'app-quick-intake',
  imports: [ReactiveFormsModule, ActionButton, DashboardIcon],
  templateUrl: './quick-intake.html',
  styleUrl: './quick-intake.scss',
})
export class QuickIntake {
  readonly previewMode = input(false);
  readonly closed = output<void>();
  readonly created = output<ServiceJob>();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('modal');
  private readonly customers = inject(CustomersApi);
  private readonly vehicles = inject(VehiclesApi);
  private readonly services = inject(ServicesApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly customer = signal<Customer | null>(null);
  readonly vehicle = signal<Vehicle | null>(null);
  readonly job = signal<ServiceJob | null>(null);
  readonly category = signal('Periodic Service');
  readonly categories = [
    'Periodic Service',
    'Oil Change',
    'Brake Repair',
    'AC / Electrical',
    'Dent & Paint',
  ];
  readonly form = new FormGroup({
    name: requiredText(),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
    }),
    registrationNumber: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9\s-]{4,20}$/),
      ],
    }),
    brand: requiredText(),
    model: requiredText(),
    vehicleType: new FormControl<'car' | 'bike' | 'scooter' | 'other'>('car', {
      nonNullable: true,
    }),
    serviceDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    complaint: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(1950),
      ],
    }),
  });
  constructor() {
    afterNextRender(() => {
      this.form.controls.serviceDate.setValue(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date()),
      );
      const element = this.dialog().nativeElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const keydown = (event: KeyboardEvent) => this.trapFocus(event);
      element.addEventListener('keydown', keydown);
      element.showModal();
      this.destroyRef.onDestroy(() => {
        element.removeEventListener('keydown', keydown);
        document.body.style.overflow = previousOverflow;
        if (element.open) element.close();
      });
    });
  }
  invalid(name: keyof typeof this.form.controls): boolean {
    const field = this.form.controls[name];
    return field.invalid && field.touched;
  }
  close(): void {
    if (this.busy()) return;
    this.dialog().nativeElement.close();
    this.closed.emit();
  }
  cancel(event: Event): void {
    event.preventDefault();
    this.close();
  }
  trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const element = this.dialog().nativeElement;
    const controls = Array.from(
      element.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) {
      event.preventDefault();
      element.focus();
      return;
    }
    if (
      event.shiftKey &&
      (event.target === first || event.target === element)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first.focus();
    }
  }
  backdrop(event: MouseEvent): void {
    const element = this.dialog().nativeElement;
    const rect = element.getBoundingClientRect();
    if (
      event.target === element &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      this.close();
  }
  private async find<T>(
    fetch: (cursor?: string) => Promise<Page<T>>,
    matches: (row: T) => boolean,
  ): Promise<T | null> {
    let cursor: string | undefined;
    do {
      const page = await fetch(cursor);
      const row = page.data.find(matches);
      if (row) return row;
      cursor = page.page.nextCursor ?? undefined;
    } while (cursor);
    return null;
  }
  async save(start: boolean): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    this.notice.set('');
    const value = this.form.getRawValue();
    const registration = normalizePlate(value.registrationNumber);
    if (
      this.form.invalid ||
      registration.length < 4 ||
      registration.length > 20 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.serviceDate)
    ) {
      this.error.set('Complete the highlighted fields to continue.');
      return;
    }
    if (this.previewMode()) {
      this.notice.set(
        'Preview only. No customer, vehicle, or job was created.',
      );
      return;
    }
    this.busy.set(true);
    try {
      let job = this.job();
      if (!job) {
        const phone = `+91${value.phone}`;
        let customer = this.customer();
        let vehicle = this.vehicle();
        if (!vehicle)
          vehicle = await this.find(
            (cursor) =>
              this.vehicles.list({ q: registration, limit: 100, cursor }),
            (row) => normalizePlate(row.registrationNumber) === registration,
          );
        if (vehicle) {
          customer = customer ?? (await this.customers.get(vehicle.customerId));
          if (customer.phone !== phone)
            throw new Error(
              'This registration belongs to another customer. Use their recorded mobile number or enter a different registration.',
            );
          if (
            customer.name.trim().toLowerCase() !==
            value.name.trim().toLowerCase()
          )
            throw new Error(
              `This mobile number is saved under ${customer.name}. Use the recorded customer name.`,
            );
          this.form.patchValue({
            brand: vehicle.brand,
            model: vehicle.model,
            vehicleType: vehicle.vehicleType,
          });
        } else {
          customer =
            customer ??
            (await this.find(
              (cursor) => this.customers.list({ q: phone, limit: 100, cursor }),
              (row) => row.phone === phone,
            ));
          if (
            customer &&
            customer.name.trim().toLowerCase() !==
              value.name.trim().toLowerCase()
          )
            throw new Error(
              `This mobile number is saved under ${customer.name}. Use the recorded customer name.`,
            );
          if (!customer)
            customer = await this.customers.create({
              name: value.name.trim(),
              phone,
            });
          this.customer.set(customer);
          this.form.controls.name.disable();
          this.form.controls.phone.disable();
          vehicle = await this.vehicles.create({
            customerId: customer._id,
            registrationNumber: registration,
            brand: value.brand.trim(),
            model: value.model.trim(),
            vehicleType: value.vehicleType,
          });
        }
        this.customer.set(customer);
        this.vehicle.set(vehicle);
        for (const name of [
          'name',
          'phone',
          'registrationNumber',
          'brand',
          'model',
          'vehicleType',
        ] as const)
          this.form.controls[name].disable();
        job = await this.services.create({
          customerId: customer._id,
          vehicleId: vehicle._id,
          serviceDate: intakeDate(value.serviceDate),
          complaint: `[${this.category()}] ${value.complaint.trim()}`,
          items: [],
        });
        this.job.set(job);
        this.form.disable();
      }
      if (start && job.status === 'draft') {
        job = await this.services.update(job._id, {
          version: job.version,
          status: 'in_progress',
        });
        this.job.set(job);
      }
      this.dialog().nativeElement.close();
      this.created.emit(job);
    } catch (error) {
      const partial = this.job()
        ? 'The draft is saved. Retry to start this job without creating another. '
        : this.customer() || this.vehicle()
          ? 'Saved intake records will be reused when you retry. '
          : '';
      this.error.set(
        partial +
          (error instanceof HttpErrorResponse
            ? apiErrorMessage(error)
            : error instanceof Error
              ? error.message
              : apiErrorMessage(error)),
      );
    } finally {
      this.busy.set(false);
    }
  }
}

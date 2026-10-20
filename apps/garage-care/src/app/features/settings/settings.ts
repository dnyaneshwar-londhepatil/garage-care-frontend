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
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ActionButton, DashboardShell } from '@garage-care/shared/ui';
import {
  AuthApi,
  GarageApi,
  Garage,
  GaragePatch,
  Address,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
const optionalText = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(200)],
  });
@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, ActionButton, DashboardShell],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
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

  private readonly api = inject(GarageApi);
  readonly garage = signal<Garage | null>(null);
  readonly submitted = signal(false);
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
    }),
    line1: optionalText(),
    line2: optionalText(),
    city: optionalText(),
    state: optionalText(),
    stateCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^\d{2}$/)],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[1-9]\d{5}$/)],
    }),
  });
  private sample: Garage = {
    _id: 'sample-g',
    name: 'Apex Auto Garage',
    phone: '+919000000000',
    address: {
      line1: 'Sample garage address',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      postalCode: '560038',
      country: 'IN',
    },
    gst: { registrationMode: 'unregistered', verificationStatus: 'unverified' },
  };
  private readonly addressKeys = [
    'line1',
    'line2',
    'city',
    'state',
    'stateCode',
    'postalCode',
  ] as const;
  private readonly requiredAddress = [
    'line1',
    'city',
    'state',
    'stateCode',
    'postalCode',
  ] as const;
  invalid(key: keyof typeof this.form.controls): boolean {
    return (
      (this.form.controls[key].invalid && this.form.controls[key].touched) ||
      (this.submitted() &&
        this.addressRequired() &&
        this.requiredAddress.includes(
          key as (typeof this.requiredAddress)[number],
        ) &&
        !this.form.controls[key].value.trim())
    );
  }
  private addressRequired(): boolean {
    return (
      !!this.garage()?.address ||
      this.addressKeys.some((key) => !!this.form.controls[key].value.trim())
    );
  }
  private fill(record: Garage): void {
    this.garage.set(record);
    this.form.reset({
      name: record.name,
      phone: record.phone.replace(/^\+91/, ''),
      line1: record.address?.line1 || '',
      line2: record.address?.line2 || '',
      city: record.address?.city || '',
      state: record.address?.state || '',
      stateCode: record.address?.stateCode || '',
      postalCode: record.address?.postalCode || '',
    });
    this.submitted.set(false);
  }
  async load(): Promise<void> {
    if (this.loading() || this.busy()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const garage = this.previewMode ? this.sample : await this.api.get();
      if (this.destroyRef.destroyed) return;
      this.fill(garage);
      if (!this.previewMode) this.auth.garage.set(garage);
    } catch (error) {
      if (!this.destroyRef.destroyed) await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.busy() || this.loading() || !this.garage()) return;
    this.form.markAllAsTouched();
    this.submitted.set(true);
    this.error.set('');
    this.notice.set('');
    if (
      this.form.invalid ||
      (this.addressRequired() &&
        this.requiredAddress.some(
          (key) => !this.form.controls[key].value.trim(),
        ))
    ) {
      this.error.set(
        'Check the highlighted fields. A saved address needs a street address, city, state, two-digit state code, and postal code.',
      );
      return;
    }
    const value = this.form.getRawValue();
    let address: Address | undefined;
    if (this.addressRequired())
      address = {
        line1: value.line1.trim(),
        ...(value.line2.trim() ? { line2: value.line2.trim() } : {}),
        city: value.city.trim(),
        state: value.state.trim(),
        stateCode: value.stateCode.trim(),
        postalCode: value.postalCode.trim(),
        country: 'IN',
      };
    const payload: GaragePatch = {
      name: value.name.trim(),
      phone: '+91' + value.phone,
      ...(address ? { address } : {}),
    };
    this.busy.set(true);
    try {
      const garage = this.previewMode
        ? { ...this.sample, ...payload }
        : await this.api.update(payload);
      if (this.destroyRef.destroyed) return;
      if (this.previewMode) this.sample = garage;
      else this.auth.garage.set(garage);
      this.fill(garage);
      this.notice.set(
        this.previewMode
          ? 'Sample settings saved for this page only.'
          : 'Garage settings saved.',
      );
    } catch (error) {
      if (!this.destroyRef.destroyed) await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
}

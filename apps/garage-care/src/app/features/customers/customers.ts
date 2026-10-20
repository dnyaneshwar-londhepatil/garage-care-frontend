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
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthApi,
  Customer,
  CustomerInput,
  CustomersApi,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import { PREVIEW_JOBS } from '../service-jobs/service-jobs.preview';

@Component({
  selector: 'app-customers',
  imports: [ReactiveFormsModule, ActionButton, DashboardIcon, DashboardShell],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers {
  readonly auth = inject(AuthApi);
  private readonly api = inject(CustomersApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly previewMode =
    inject(ActivatedRoute).snapshot.data['preview'] === true;
  readonly ready = signal(false);
  readonly search = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100)],
  });
  readonly query = signal('');
  readonly records = signal<Customer[]>(
    this.previewMode
      ? [
          ...new Map(
            PREVIEW_JOBS.map((row) => [row.customer._id, row.customer]),
          ).values(),
        ]
      : [],
  );
  readonly rows = computed(() =>
    this.previewMode
      ? this.records().filter((customer) =>
          [customer.name, customer.phone, customer.email || ''].some((value) =>
            value.toLowerCase().includes(this.query().toLowerCase()),
          ),
        )
      : this.records(),
  );
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly notice = signal('');
  readonly cursor = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<Customer | null>(null);
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
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(254)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
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
    this.search.markAsTouched();
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
      if (this.destroyRef.destroyed) return;
      this.records.set(
        append
          ? [
              ...new Map(
                [...this.records(), ...page.data].map((customer) => [
                  customer._id,
                  customer,
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
  async open(customer?: Customer): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.error.set('');
    this.formError.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      const record = customer
        ? this.previewMode
          ? customer
          : await this.api.get(customer._id)
        : null;
      if (this.destroyRef.destroyed) return;
      this.editing.set(record);
      this.form.reset({
        name: record?.name || '',
        phone: record?.phone.replace(/^\+91/, '') || '',
        email: record?.email || '',
        address: record?.address || '',
        notes: record?.notes || '',
      });
      this.editorOpen.set(true);
      setTimeout(() => {
        if (!this.destroyRef.destroyed)
          document.getElementById('customer-name')?.focus();
      });
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      await this.expired(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  close(): void {
    if (this.busy()) return;
    this.editorOpen.set(false);
    this.editing.set(null);
    this.formError.set('');
    document.getElementById('add-customer')?.focus();
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    this.formError.set('');
    if (this.form.invalid) {
      this.formError.set('Check the highlighted fields.');
      return;
    }
    const value = this.form.getRawValue();
    const payload: CustomerInput = {
      name: value.name.trim(),
      phone: '+91' + value.phone,
      ...(value.email.trim() ? { email: value.email.trim() } : {}),
      address: value.address.trim(),
      notes: value.notes.trim(),
    };
    // An omitted email preserves the existing email address; do not imply it was cleared.
    if (this.editing()?.email && !value.email.trim()) {
      this.formError.set(
        'Enter an email address to replace the saved email, or keep the existing one.',
      );
      return;
    }
    this.busy.set(true);
    try {
      const current = this.editing();
      const saved: Customer = this.previewMode
        ? {
            ...current,
            ...payload,
            _id: current?._id || 'preview-' + crypto.randomUUID(),
          }
        : current
          ? await this.api.update(current._id, payload)
          : await this.api.create(payload);
      if (this.destroyRef.destroyed) return;
      if (this.previewMode)
        this.records.update((rows) =>
          current
            ? rows.map((row) => (row._id === saved._id ? saved : row))
            : [saved, ...rows],
        );
      this.editorOpen.set(false);
      this.editing.set(null);
      this.notice.set(
        this.previewMode
          ? 'Sample customer saved for this preview only. No server record was changed.'
          : 'Customer saved.',
      );
      document.getElementById('add-customer')?.focus();
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

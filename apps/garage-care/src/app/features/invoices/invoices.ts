import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActionButton,
  DashboardIcon,
  DashboardShell,
} from '@garage-care/shared/ui';
import { DatePipe } from '@angular/common';
import {
  AuthApi,
  Invoice,
  InvoicesApi,
  ServicesApi,
  CustomersApi,
  NotificationsApi,
  Notification,
  apiErrorMessage,
} from '@garage-care/shared/data-access';
@Component({
  selector: 'app-invoices',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ActionButton,
    DashboardIcon,
    DashboardShell,
  ],
  templateUrl: './invoices.html',
  styleUrl: './invoices.scss',
})
export class Invoices {
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

  private readonly api = inject(InvoicesApi);
  private readonly services = inject(ServicesApi);
  private readonly customers = inject(CustomersApi);
  private readonly notifications = inject(NotificationsApi);
  readonly records = signal<Invoice[]>([]);
  readonly selected = signal<Invoice | null>(null);
  readonly delivery = signal<{
    invoice: Invoice;
    phone: string;
    name: string;
  } | null>(null);
  readonly deliveries = signal(new Map<string, Notification>());
  private readonly keys = new Map<string, string>();
  private readonly samples: Invoice[] = [
    {
      _id: 'sample-i1',
      serviceId: 'JC-1046',
      invoiceNumber: 'SAMPLE/2026-27/00001',
      status: 'finalized',
      finalizedAt: '2026-10-12T10:00:00Z',
      pdfStatus: 'ready',
      snapshot: {
        customer: { name: 'Suresh Patil', phone: '+919000000000' },
        vehicle: {
          registrationNumber: 'MH12AB4590',
          brand: 'Honda',
          model: 'Activa 6G',
        },
        totals: { grandTotalPaise: 185000 },
      },
    },
  ];
  money(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value / 100);
  }
  field(invoice: Invoice, section: string, key: string): string {
    const value = invoice.snapshot[section];
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return 'Not recorded';
    const field = (value as Record<string, unknown>)[key];
    return typeof field === 'string' ? field : 'Not recorded';
  }
  async load(append = false): Promise<void> {
    if (this.loading() || this.busy() || this.search.invalid) return;
    if (!append) this.query.set(this.search.value.trim());
    this.error.set('');
    if (this.previewMode) {
      this.records.set(
        this.samples.filter((row) =>
          row.invoiceNumber.toLowerCase().includes(this.query().toLowerCase()),
        ),
      );
      return;
    }
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
  async view(invoice: Invoice): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.delivery.set(null);
    try {
      const record = this.previewMode
        ? invoice
        : await this.api.get(invoice._id);
      if (!this.destroyRef.destroyed) this.selected.set(record);
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  async download(invoice: Invoice): Promise<void> {
    if (this.busy()) return;
    if (this.previewMode) {
      this.notice.set('Sample invoice. No real PDF is available.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const blob = await this.api.pdf(invoice._id);
      if (this.destroyRef.destroyed) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download =
        invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '-') + '.pdf';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notice.set('Invoice PDF downloaded.');
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  async prepare(invoice: Invoice): Promise<void> {
    if (this.busy()) return;
    if (this.previewMode) {
      this.notice.set('Preview only. No message will be sent.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const record = await this.api.get(invoice._id);
      if (record.pdfStatus !== 'ready') {
        this.notice.set(
          'The invoice PDF is not ready yet. Refresh to check its status.',
        );
        return;
      }
      const service = await this.services.get(record.serviceId);
      const customer = await this.customers.get(service.customerId);
      if (customer.whatsappConsent?.status !== 'opted_in') {
        this.notice.set(
          'Recorded customer WhatsApp consent is required before sending this invoice.',
        );
        return;
      }
      if (!this.destroyRef.destroyed)
        this.delivery.set({
          invoice: record,
          phone: customer.phone,
          name: customer.name,
        });
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  async send(): Promise<void> {
    if (this.previewMode) {
      this.notice.set('Preview only. No message will be sent.');
      return;
    }
    const candidate = this.delivery();
    if (!candidate || this.busy()) return;
    const identity = candidate.invoice._id + '|' + candidate.phone;
    let key = this.keys.get(identity);
    if (!key) {
      key = crypto.randomUUID();
      this.keys.set(identity, key);
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const notification = await this.api.sendWhatsApp(
        candidate.invoice._id,
        candidate.phone,
        key,
      );
      if (this.destroyRef.destroyed) return;
      this.deliveries.update((map) =>
        new Map(map).set(candidate.invoice._id, notification),
      );
      this.delivery.set(null);
      this.notice.set(
        'Invoice delivery status: ' +
          notification.status +
          '. A queued request does not confirm delivery.',
      );
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
  async check(invoice: Invoice): Promise<void> {
    const notification = this.deliveries().get(invoice._id);
    if (!notification || this.busy()) return;
    this.busy.set(true);
    try {
      const latest = await this.notifications.get(notification._id);
      if (!this.destroyRef.destroyed) {
        this.deliveries.update((map) => new Map(map).set(invoice._id, latest));
        this.notice.set('Invoice delivery status: ' + latest.status + '.');
      }
    } catch (error) {
      await this.report(error);
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
  }
}
